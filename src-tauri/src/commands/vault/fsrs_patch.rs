use crate::frontmatter::{update_frontmatter_content, FrontmatterValue};
use std::{collections::BTreeMap, fs, io::Write, path::Path, sync::Mutex};

use super::boundary::{with_validated_path, ValidatedPathMode};

static SCHEDULE_WRITE: Mutex<()> = Mutex::new(());
const KEYS: &[&str] = &[
    "_fsrs_enabled",
    "_fsrs_state",
    "_fsrs_due",
    "_fsrs_stability",
    "_fsrs_difficulty",
    "_fsrs_elapsed_days",
    "_fsrs_scheduled_days",
    "_fsrs_reps",
    "_fsrs_lapses",
    "_fsrs_last_review",
];

/// Legacy scheduling bridge. A complete schedule replaces the note once;
/// unrelated metadata and Markdown are retained by the source-preserving parser.
#[tauri::command]
pub fn update_fsrs_schedule(
    path: String,
    patch: BTreeMap<String, FrontmatterValue>,
    vault_path: Option<String>,
) -> Result<String, String> {
    if patch.is_empty() || patch.keys().any(|key| !KEYS.contains(&key.as_str())) {
        return Err("Invalid FSRS schedule fields".into());
    }
    let _guard = SCHEDULE_WRITE.lock().map_err(|e| e.to_string())?;
    let boundary = super::boundary::VaultBoundary::from_request(vault_path.as_deref())?;
    with_validated_path(
        &path,
        vault_path.as_deref(),
        ValidatedPathMode::Existing,
        |validated| {
            crate::learning::with_legacy_write(boundary.requested_root(), || {
                persist_schedule(Path::new(validated), patch)
            })
        },
    )
}

fn persist_schedule(
    path: &Path,
    patch: BTreeMap<String, FrontmatterValue>,
) -> Result<String, String> {
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default();
    if !extension.eq_ignore_ascii_case("md") && !extension.eq_ignore_ascii_case("markdown") {
        return Err("Schedules can only be written to Markdown notes".into());
    }
    let mut content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    for (key, value) in patch {
        content = update_frontmatter_content(&content, &key, Some(value))?;
    }
    let parent = path.parent().ok_or("Note has no parent directory")?;
    let mut staged = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    staged
        .as_file()
        .set_permissions(fs::metadata(path).map_err(|e| e.to_string())?.permissions())
        .map_err(|e| e.to_string())?;
    staged
        .write_all(content.as_bytes())
        .map_err(|e| e.to_string())?;
    staged.as_file().sync_all().map_err(|e| e.to_string())?;
    staged.persist(path).map_err(|e| e.to_string())?;
    Ok(content)
}
