use super::{
    legacy_markdown,
    page_identity::{fresh_page_id, with_page_id},
    pages::page_identity_at,
    MigrationState, Store,
};
use std::{fs, path::Path};

fn learning_store(root: &Path) -> Result<Option<Store>, String> {
    if !root.join(".memnova/learning.sqlite3").exists()
        && !root.join(".memnova/library.json").exists()
    {
        return Ok(None);
    }
    let store = Store::open(root)?;
    match store.migration_state()? {
        MigrationState::Migrating => {
            Err("Finish or recover the Library import before editing lessons".into())
        }
        MigrationState::Ready => Ok(Some(store)),
        MigrationState::Legacy => Ok(None),
    }
}

pub fn prepare_save(root: &Path, path: &Path, incoming: &str) -> Result<String, String> {
    let Some(store) = learning_store(root)? else {
        return Ok(incoming.into());
    };
    let canonical = path.canonicalize().map_err(|error| error.to_string())?;
    let relative = canonical
        .strip_prefix(&store.root)
        .map_err(|error| error.to_string())?
        .to_string_lossy()
        .replace(std::path::MAIN_SEPARATOR, "/");
    let registered = page_identity_at(&store.conn, &relative)?;
    let existing = registered.or_else(|| {
        fs::read_to_string(path).ok().and_then(|source| {
            legacy_markdown::frontmatter(&source)
                .ok()
                .and_then(|(metadata, _)| legacy_markdown::page_id(&metadata).ok().flatten())
        })
    });
    match existing {
        Some(id) => with_page_id(incoming, &id),
        None => Ok(incoming.into()),
    }
}

pub fn prepare_create(root: &Path, incoming: &str) -> Result<String, String> {
    if learning_store(root)?.is_none() {
        return Ok(incoming.into());
    }
    fresh_page_id(incoming)
}

pub fn with_source_write<T>(write: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
    let _operation = super::migration_import::MIGRATION_OPERATION
        .lock()
        .map_err(|error| error.to_string())?;
    write()
}

/// The generic file writer must not become a second writer for a bound note.
pub fn guard_memory_write(root: &Path, path: &Path) -> Result<(), String> {
    let Some(store) = learning_store(root)? else {
        return Ok(());
    };
    let relative = path
        .canonicalize()
        .map_err(|error| error.to_string())?
        .strip_prefix(&store.root)
        .map_err(|error| error.to_string())?
        .to_string_lossy()
        .replace(std::path::MAIN_SEPARATOR, "/");
    let registered = page_identity_at(&store.conn, &relative)?;
    let owned = super::note_memory::parse_document(
        &fs::read_to_string(path).map_err(|error| error.to_string())?,
    )
    .page_id;
    for page in registered.iter().chain(owned.iter()) {
        if store.note_binding(page)?.is_some() {
            return Err("bound-note-card: use the note source coordinator".into());
        }
        super::note_guard::require_note_page_writable(&store.conn, page)?;
    }
    Ok(())
}

/// Write-side identity preparation; read-only validation keeps using prepare_save.
pub fn prepare_generic_save(root: &Path, path: &Path, incoming: &str) -> Result<String, String> {
    guard_memory_write(root, path)?;
    prepare_save(root, path, incoming)
}

fn pending_files(store: &Store) -> Result<Vec<(String, String)>, String> {
    let mut query = store.conn.prepare("SELECT DISTINCT o.page_id,p.path FROM note_learning_operations o JOIN pages p ON p.id=o.page_id WHERE o.phase!='applied'")
        .map_err(|error| error.to_string())?;
    let rows = query
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn pending_identity_in_tree(
    path: &Path,
    identities: &std::collections::HashSet<&str>,
) -> Result<bool, String> {
    // One scan per affected path, even if several operations need recovery.
    for entry in walkdir::WalkDir::new(path).follow_links(false) {
        let entry = entry.map_err(|error| error.to_string())?;
        if !entry.file_type().is_file() || !entry.path().extension().is_some_and(|ext| ext == "md")
        {
            continue;
        }
        let source = fs::read_to_string(entry.path()).map_err(|error| error.to_string())?;
        if super::note_memory::parse_document(&source)
            .page_id
            .as_deref()
            .is_some_and(|id| identities.contains(id))
        {
            return Ok(true);
        }
    }
    Ok(false)
}

/// Preflight the whole affected set before a destructive file operation.
/// Call while holding with_source_write so an app writer cannot prepare a journal
/// between validation and mutation. Renames may rewrite backlinks across the root.
pub fn guard_file_lifecycle(root: &Path, paths: &[&Path]) -> Result<(), String> {
    let Some(store) = learning_store(root)? else {
        return Ok(());
    };
    let pending = pending_files(&store)?;
    if pending.is_empty() {
        return Ok(());
    }
    let identities = pending.iter().map(|(id, _)| id.as_str()).collect();
    for path in paths {
        let canonical = path.canonicalize().map_err(|error| error.to_string())?;
        if !canonical.starts_with(&store.root) {
            return Err("Path must stay inside the Library".into());
        }
        let registered = pending
            .iter()
            .any(|(_, relative)| store.root.join(relative).starts_with(&canonical));
        // External moves can leave the registered path behind.
        if registered || pending_identity_in_tree(&canonical, &identities)? {
            return Err(
                "pending-note-operation: recover the note before moving or deleting its files"
                    .into(),
            );
        }
    }
    Ok(())
}

/// Learning history belongs to a Library. Cross-Library transfer needs an
/// explicit export/restore workflow; a file move must not silently reset it.
pub fn guard_library_move(root: &Path, path: &Path) -> Result<(), String> {
    let Some(store) = learning_store(root)? else {
        return Ok(());
    };
    let source = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let document = super::note_memory::parse_document(&source);
    let bound = match document.page_id.as_deref() {
        Some(id) => store.note_binding(id)?.is_some(),
        None => false,
    };
    if document.config.is_some() || bound {
        return Err("note-memory-library-move: use a verified Library backup and restore to retain learning history".into());
    }
    Ok(())
}
