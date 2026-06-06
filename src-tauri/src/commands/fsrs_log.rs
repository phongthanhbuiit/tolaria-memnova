use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

use serde::Serialize;
use tauri::AppHandle;

/// One review log entry — written as a single JSON line.
#[derive(Serialize)]
struct FsrsReviewEntry {
    /// Unix timestamp of the review (seconds)
    ts: i64,
    /// Vault-relative or absolute path of the note reviewed
    note_path: String,
    /// Rating given: 1=Again, 2=Hard, 3=Good, 4=Easy
    rating: u8,
    /// FSRS card state before this review: "new" | "learning" | "review" | "relearning"
    state_before: String,
    /// Scheduled interval in days after this review (0 for learning/relearning steps)
    scheduled_days: i64,
}

/// Returns the path to the FSRS review log file:
/// `{app_data_dir}/fsrs-reviews.jsonl`
///
/// The log is stored outside the vault (installation-specific data).
fn resolve_log_path(app: &AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;

    Ok(data_dir.join("fsrs-reviews.jsonl"))
}

/// Append a single FSRS review record to the JSONL log file.
///
/// The file is created if it does not yet exist. Each call appends exactly
/// one newline-terminated JSON object — safe for concurrent usage because
/// single-line appends to a regular file are atomic on POSIX filesystems.
#[tauri::command]
pub async fn append_fsrs_review(
    app: AppHandle,
    note_path: String,
    rating: u8,
    state_before: String,
    scheduled_days: i64,
) -> Result<(), String> {
    if !(1..=4).contains(&rating) {
        return Err(format!("Invalid FSRS rating: {rating} (must be 1–4)"));
    }

    let log_path = resolve_log_path(&app)?;

    // Ensure parent directory exists
    if let Some(parent) = log_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create log directory: {e}"))?;
    }

    let entry = FsrsReviewEntry {
        ts: chrono::Utc::now().timestamp(),
        note_path,
        rating,
        state_before,
        scheduled_days,
    };

    let mut line =
        serde_json::to_string(&entry).map_err(|e| format!("Failed to serialise review: {e}"))?;
    line.push('\n');

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("Failed to open review log {}: {e}", log_path.display()))?;

    file.write_all(line.as_bytes())
        .map_err(|e| format!("Failed to write review log: {e}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::FsrsReviewEntry;

    #[test]
    fn review_entry_serialises_to_expected_fields() {
        let entry = FsrsReviewEntry {
            ts: 1_717_000_000,
            note_path: "flashcards/biology/cell.md".to_string(),
            rating: 3,
            state_before: "review".to_string(),
            scheduled_days: 7,
        };
        let json = serde_json::to_string(&entry).unwrap();
        assert!(json.contains("\"rating\":3"));
        assert!(json.contains("\"state_before\":\"review\""));
        assert!(json.contains("\"scheduled_days\":7"));
    }
}
