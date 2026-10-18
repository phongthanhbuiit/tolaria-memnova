use super::{
    migration_plan::content_hash,
    note_conversion_cards::{candidates, page_storage_fingerprint, sessions},
    note_conversion_models::{NoteConversionPage, NoteConversionPreview},
    note_conversion_sources::SourceCatalog,
    note_memory::parse_document,
    note_preview_storage::PreviewStorage,
};
use rusqlite::Connection;
use std::{collections::BTreeMap, path::Path};

#[derive(Default)]
struct RegisteredPage {
    id: String,
    title: String,
    deleted: bool,
}
fn registered(connection: &Connection) -> Result<BTreeMap<String, RegisteredPage>, String> {
    let mut query = connection
        .prepare("SELECT id,path,title,deleted_at FROM pages ORDER BY path")
        .map_err(|error| error.to_string())?;
    let rows = query
        .query_map([], |row| {
            Ok((
                row.get(1)?,
                RegisteredPage {
                    id: row.get(0)?,
                    title: row.get(2)?,
                    deleted: row.get::<_, Option<i64>>(3)?.is_some(),
                },
            ))
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<_, _>>()
        .map_err(|error| error.to_string())
}
fn empty_page(path: &str, registered: Option<&RegisteredPage>) -> NoteConversionPage {
    NoteConversionPage {
        page_id: registered.map(|page| page.id.clone()),
        path: path.into(),
        title: registered
            .map(|page| page.title.clone())
            .unwrap_or_else(|| path.into()),
        source_hash: None,
        front: String::new(),
        back: None,
        properties_raw: String::new(),
        config: None,
        classification: "invalid".into(),
        issues: Vec::new(),
        candidates: Vec::new(),
        suggested_reuse_card_id: None,
        session_fingerprint: String::new(),
        active_session_count: 0,
        media: Vec::new(),
        fingerprint: String::new(),
        page_storage_fingerprint: String::new(),
    }
}
fn project_source(
    page: &mut NoteConversionPage,
    source: Option<&str>,
    catalog: &SourceCatalog,
    registered: Option<&RegisteredPage>,
) {
    let Some(source) = source else {
        page.issues.push("missingSource".into());
        return;
    };
    let document = parse_document(source);
    page.source_hash = Some(content_hash(source));
    page.properties_raw = source[..document.ranges.front.start].into();
    page.front = document.front;
    page.back = document.ranges.back.map(|_| document.back);
    page.config = document.config;
    if page.page_id.is_none() {
        page.page_id = document.page_id.clone();
    }
    if !document.issues.is_empty() {
        page.issues.push("invalidDocument".into());
    }
    if registered.is_some_and(|owner| document.page_id.as_deref() != Some(&owner.id)) {
        page.issues.push("changedIdentity".into());
    }
    if registered.is_some_and(|owner| owner.deleted) {
        page.issues.push("deletedSource".into());
    }
    if page
        .page_id
        .as_ref()
        .is_some_and(|id| catalog.duplicate(id))
    {
        page.issues.push("duplicateIdentity".into());
    }
}
fn project_storage(
    page: &mut NoteConversionPage,
    connection: &Connection,
) -> Result<(bool, bool), String> {
    let Some(id) = &page.page_id else {
        return Ok((false, false));
    };
    page.candidates = candidates(connection, id)?;
    let binding = super::note_storage::read_note_binding(connection, id)?;
    let pending = !super::note_storage::pending_operations(connection, id, None)?.is_empty();
    (page.session_fingerprint, page.active_session_count) = sessions(connection, id)?;
    page.page_storage_fingerprint = page_storage_fingerprint(connection, id)?;
    Ok((binding.is_some(), pending))
}
fn classification(page: &NoteConversionPage, bound: bool, pending: bool) -> &'static str {
    if pending {
        return "pending";
    }
    if !page.issues.is_empty() {
        return "invalid";
    }
    if bound {
        return "bound";
    }
    if page.candidates.is_empty() {
        return if page.back.is_some() || page.properties_raw.contains("_fsrs_") {
            "legacyMarkdown"
        } else {
            "ordinary"
        };
    }
    let live: Vec<_> = page
        .candidates
        .iter()
        .filter(|candidate| candidate.card.status != "trashed")
        .collect();
    if live.is_empty() {
        return "trashed";
    }
    if live.len() > 1 {
        return "multiple";
    }
    let card = &live[0].card;
    if card.answer_mode == "page" {
        return "wholePage";
    }
    if card.front == page.front && page.back.as_deref() == Some(card.back.as_str()) {
        "matching"
    } else {
        "conflict"
    }
}
fn project_media(page: &mut NoteConversionPage, root: &Path) {
    let mut media = super::note_media::MediaSnapshot::default();
    for content in [&page.front, page.back.as_deref().unwrap_or("")] {
        match media.collect(root, &page.path, content) {
            Ok(mut references) => page.media.append(&mut references),
            Err(_) => {
                page.issues.push("unresolvedMedia".into());
                return;
            }
        }
    }
}
fn preview_pages(
    root: &Path,
    catalog: &SourceCatalog,
    connection: Option<&Connection>,
) -> Result<Vec<NoteConversionPage>, String> {
    let mut registered = connection.map(registered).transpose()?.unwrap_or_default();
    for path in catalog.files.keys() {
        registered.entry(path.clone()).or_default();
    }
    let mut result = Vec::new();
    for (path, owner) in registered {
        let owner = (!owner.id.is_empty()).then_some(&owner);
        let mut page = empty_page(&path, owner);
        project_source(
            &mut page,
            catalog.files.get(&path).and_then(|raw| raw.as_deref()),
            catalog,
            owner,
        );
        let (bound, pending) = if let Some(connection) = connection {
            project_storage(&mut page, connection)?
        } else {
            (false, false)
        };
        if page.issues.is_empty() {
            project_media(&mut page, root);
        }
        page.classification = classification(&page, bound, pending).into();
        if page.classification == "matching" {
            page.suggested_reuse_card_id = page
                .candidates
                .iter()
                .find(|candidate| candidate.card.status != "trashed")
                .map(|candidate| candidate.card.id.clone());
        }
        page.fingerprint =
            content_hash(&serde_json::to_string(&page).map_err(|error| error.to_string())?);
        result.push(page);
    }
    Ok(result)
}
pub fn preview_note_conversion(
    root: &Path,
    expected_library_id: Option<&str>,
) -> Result<NoteConversionPreview, String> {
    let root = root.canonicalize().map_err(|error| error.to_string())?;
    let storage = PreviewStorage::read(&root, expected_library_id)?;
    let catalog = SourceCatalog::read(&root)?;
    let connection = if storage.schema_version == Some(super::SCHEMA_VERSION) {
        storage.connection.as_ref()
    } else {
        None
    };
    let pages = preview_pages(&root, &catalog, connection)?;
    catalog.verify(&root)?;
    storage.ensure_unchanged()?;
    let mut result = NoteConversionPreview {
        version: 1,
        library_id: storage.library_id,
        schema_version: storage.schema_version,
        state: storage.state,
        pages,
        fingerprint: String::new(),
    };
    result.fingerprint =
        content_hash(&serde_json::to_string(&result).map_err(|error| error.to_string())?);
    Ok(result)
}
