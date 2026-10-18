use super::{
    cards::read_card,
    migration_plan::content_hash,
    note_lifecycle::{NoteLearningState, NoteMemoryView},
    note_memory::{parse_document, useful_content, MemoryBack, MemoryFace},
    note_storage::read_note_binding,
    page_sources::SourceCatalog,
    store::checked_page_path,
};
use rusqlite::Connection;
use std::{fs, path::Path};

pub(super) fn read_note_source(
    connection: &Connection,
    root: &Path,
    page_id: &str,
) -> Result<(String, String), String> {
    uuid::Uuid::parse_str(page_id).map_err(|_| "invalid-page-id")?;
    let path: String = connection
        .query_row(
            "SELECT path FROM pages WHERE id=?1 AND deleted_at IS NULL",
            [page_id],
            |row| row.get(0),
        )
        .map_err(|_| "missing-page")?;
    let source =
        fs::read_to_string(checked_page_path(root, &path)?).map_err(|_| "unreadable-page")?;
    if parse_document(&source).page_id.as_deref() != Some(page_id) {
        return Err("changed-page-identity".into());
    }
    Ok((path, source))
}

pub(super) fn mnemonic_source(
    connection: &Connection,
    root: &Path,
    owner: &str,
    back: &MemoryBack,
) -> Result<Option<(String, String)>, String> {
    let MemoryBack::Page { page_id, face } = back else {
        return Ok(None);
    };
    if page_id == owner {
        return Err("self-source".into());
    }
    let (path, source) = read_note_source(connection, root, page_id)?;
    let document = parse_document(&source);
    if !document.issues.is_empty() {
        return Err("invalid-source".into());
    }
    let content = match face {
        MemoryFace::Front => document.front,
        MemoryFace::Back => {
            if matches!(
                document.config.as_ref().map(|config| &config.back),
                Some(MemoryBack::Page { .. })
            ) {
                return Err("recursive-back-source".into());
            }
            if document.ranges.back.is_none() {
                return Err("missing-source-back".into());
            }
            document.back
        }
    };
    Ok(Some((path, content)))
}

fn source_state(
    connection: &Connection,
    root: &Path,
    view: &mut NoteMemoryView,
    source: &str,
    sources: Option<&SourceCatalog>,
) {
    let document = parse_document(source);
    view.source_hash = Some(content_hash(source));
    view.has_back = document.ranges.back.is_some();
    view.config = document.config.clone();
    if document.page_id.as_deref() != Some(&view.page_id) || !document.issues.is_empty() {
        view.diagnostics.push("invalid-document".into());
        view.state = NoteLearningState::Invalid;
        return;
    }
    let Some(config) = &document.config else {
        view.state = if view.binding.is_some() {
            NoteLearningState::Invalid
        } else if view.has_back {
            NoteLearningState::Retained
        } else {
            NoteLearningState::Ordinary
        };
        return;
    };
    if !config.enabled {
        view.state = NoteLearningState::Disabled;
        return;
    }
    if view.binding.is_none() && view.legacy_card_count > 0 {
        view.state = NoteLearningState::ConversionRequired;
        return;
    }
    let front = useful_content(&document.front);
    let back = mnemonic_source(connection, root, &view.page_id, &config.back).and_then(|linked| {
        if let (MemoryBack::Page { page_id, .. }, Some((path, _))) = (&config.back, &linked) {
            if !sources.is_some_and(|catalog| catalog.matches(page_id, path)) {
                return Err("source-identity-conflict".into());
            }
        }
        useful_content(
            linked
                .as_ref()
                .map(|(_, content)| content.as_str())
                .unwrap_or(&document.back),
        )
    });
    view.state = match (front, back) {
        (Ok(true), Ok(true)) => NoteLearningState::Ready,
        (Ok(_), Ok(_)) => NoteLearningState::Draft,
        (Err(problem), _) | (_, Err(problem)) => {
            view.diagnostics.push(problem);
            NoteLearningState::Invalid
        }
    };
}

pub(super) fn memory_view(
    connection: &Connection,
    root: &Path,
    page_id: &str,
    ignore_operation: Option<&str>,
) -> Result<NoteMemoryView, String> {
    uuid::Uuid::parse_str(page_id).map_err(|_| "invalid-page-id")?;
    let sources = SourceCatalog::scan(root);
    memory_view_with_sources(
        connection,
        root,
        page_id,
        ignore_operation,
        sources.as_ref().ok(),
    )
}

pub(super) fn memory_view_with_sources(
    connection: &Connection,
    root: &Path,
    page_id: &str,
    ignore_operation: Option<&str>,
    sources: Option<&SourceCatalog>,
) -> Result<NoteMemoryView, String> {
    let (mut view, deleted) = initial_view(connection, page_id)?;
    if deleted.is_none() {
        let source = checked_page_path(root, &view.path)
            .and_then(|path| fs::read_to_string(path).map_err(|error| error.to_string()));
        match source {
            Ok(source) => source_state(connection, root, &mut view, &source, sources),
            Err(_) => {
                view.state = NoteLearningState::Invalid;
                view.diagnostics.push("unreadable-page".into());
            }
        }
    }
    if deleted.is_none() && !sources.is_some_and(|catalog| catalog.matches(page_id, &view.path)) {
        view.identity_valid = false;
        view.state = NoteLearningState::Invalid;
        view.diagnostics.push("identity-conflict".into());
    }
    view.pending_operations =
        super::note_storage::pending_operations(connection, page_id, ignore_operation)?;
    if !view.pending_operations.is_empty() {
        view.state = NoteLearningState::Pending;
        view.diagnostics.push("pending-operation".into());
    }
    Ok(view)
}

fn initial_view(
    connection: &Connection,
    page_id: &str,
) -> Result<(NoteMemoryView, Option<i64>), String> {
    uuid::Uuid::parse_str(page_id).map_err(|_| "invalid-page-id")?;
    let (path, deleted): (String, Option<i64>) = connection
        .query_row(
            "SELECT path,deleted_at FROM pages WHERE id=?1",
            [page_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|error| error.to_string())?;
    let binding = read_note_binding(connection, page_id)?;
    let schedule = binding
        .as_ref()
        .map(|binding| read_card(connection, &binding.card_id).map(|card| card.schedule))
        .transpose()?;
    let legacy_card_count = connection.query_row("SELECT count(*) FROM cards c WHERE page_id=?1 AND NOT EXISTS(SELECT 1 FROM note_card_bindings b WHERE b.card_id=c.id)", [page_id], |row| row.get(0)).map_err(|error| error.to_string())?;
    let view = NoteMemoryView {
        page_id: page_id.into(),
        path,
        source_hash: None,
        config: None,
        has_back: false,
        state: NoteLearningState::Deleted,
        binding,
        schedule,
        legacy_card_count,
        diagnostics: Vec::new(),
        pending_operations: Vec::new(),
        identity_valid: true,
    };
    Ok((view, deleted))
}
