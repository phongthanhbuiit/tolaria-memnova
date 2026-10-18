use super::{
    legacy_markdown, page_identity::with_page_id, pages::page_identity_at, MigrationState, Store,
};
use std::{fs, path::Path};

fn learning_store(root: &Path) -> Result<Option<Store>, String> {
    if !root.join(".memnova/learning.sqlite3").exists() {
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
    crate::frontmatter::update_frontmatter_content(
        incoming,
        "_memnova_page_id",
        Some(crate::frontmatter::FrontmatterValue::String(
            uuid::Uuid::new_v4().to_string(),
        )),
    )
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
