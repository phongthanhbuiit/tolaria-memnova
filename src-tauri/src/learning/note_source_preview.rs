//! Source selection is read-only, including for Markdown without a page identity.
use super::{
    migration_plan::content_hash,
    note_media::MediaSnapshot,
    note_memory::{parse_document, MemoryBack, MemoryDocument, MemoryFace},
    note_preview_storage::PreviewStorage,
    store::checked_page_path,
    NoteMediaDependency,
};
use rusqlite::{Connection, OptionalExtension};
use serde::Serialize;
use std::{fs, path::Path};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteSourcePreview {
    pub page_id: Option<String>,
    pub path: String,
    pub face: MemoryFace,
    pub content: String,
    pub source_hash: String,
    /// Selection fingerprint covers the selected face/media, independently of UUID registration.
    pub fingerprint: String,
    pub media: Vec<NoteMediaDependency>,
    pub has_back: bool,
    pub back_linked: bool,
}

fn selected_face(document: &MemoryDocument, face: MemoryFace) -> Result<&str, String> {
    if !document.issues.is_empty() {
        return Err("invalid-source-document".into());
    }
    match face {
        MemoryFace::Front => Ok(&document.front),
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
            Ok(&document.back)
        }
    }
}

fn validate_source_identity(
    connection: &Connection,
    root: &Path,
    relative: &str,
    id: Option<&str>,
) -> Result<(), String> {
    let registered: Option<String> = connection
        .query_row(
            "SELECT id FROM pages WHERE path=?1 AND deleted_at IS NULL",
            [relative],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    if let Some(registered) = registered {
        super::note_guard::require_note_page_writable(connection, &registered)?;
        if id.is_none()
            && super::note_storage::read_note_binding(connection, &registered)?.is_some()
        {
            return Err("changed-page-identity".into());
        }
    }
    if let Some(id) = id {
        super::note_guard::require_note_page_writable(connection, id)?;
        if super::pages::source_ids(root)?
            .get(id)
            .map(|(path, _)| path.as_str())
            != Some(relative)
        {
            return Err("identity-conflict".into());
        }
    }
    Ok(())
}

pub fn preview_note_source(
    root: &Path,
    library_id: &str,
    relative: &str,
    face: MemoryFace,
) -> Result<NoteSourcePreview, String> {
    let canonical_root = root.canonicalize().map_err(|error| error.to_string())?;
    let root = canonical_root.as_path();
    let storage = PreviewStorage::read(root, Some(library_id))?;
    if storage.state != "ready" {
        return Err("source-preview-requires-ready-library".into());
    }
    let connection = storage
        .connection
        .as_ref()
        .ok_or("missing-preview-database")?;
    let path = checked_page_path(root, relative)?;
    let source = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    let document = parse_document(&source);
    let content = selected_face(&document, face)?.to_string();
    validate_source_identity(connection, root, relative, document.page_id.as_deref())?;
    let source_hash = content_hash(&source);
    let media = MediaSnapshot::default().collect(root, relative, &content)?;
    let has_back = document.ranges.back.is_some();
    let back_linked = matches!(
        document.config.as_ref().map(|config| &config.back),
        Some(MemoryBack::Page { .. })
    );
    let fingerprint = content_hash(&serde_json::json!({"path":relative,"face":face,"content":content,"media":media,"hasBack":has_back,"backLinked":back_linked}).to_string());
    if content_hash(&fs::read_to_string(&path).map_err(|error| error.to_string())?) != source_hash {
        return Err("source-preview-changed".into());
    }
    storage.ensure_unchanged()?;
    Ok(NoteSourcePreview {
        page_id: document.page_id,
        path: relative.into(),
        face,
        content,
        source_hash,
        fingerprint,
        media,
        has_back,
        back_linked,
    })
}
