use super::{backup::read_optional_recovery, identity::reject_symlink};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    path::{Component, Path, PathBuf},
};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct LegacyReview {
    pub id: String,
    pub note_path: String,
    pub rating: u8,
    pub reviewed_at: i64,
}

#[derive(Deserialize)]
struct LogRow {
    ts: i64,
    note_path: String,
    rating: u8,
    state_before: String,
    scheduled_days: f64,
}

pub(super) struct ParsedLog {
    pub reviews: Vec<LegacyReview>,
    pub invalid: usize,
    pub unscoped: usize,
}

pub(super) fn recovery_log(
    root: &Path,
    legacy_path: Option<&Path>,
) -> Result<Option<String>, String> {
    reject_symlink(&root.join(".memnova"))?;
    let recovered = read_optional_recovery(&root.join(".memnova/legacy-review-log.jsonl"))?;
    let bytes = if recovered.is_some() {
        recovered
    } else {
        legacy_path
            .map(read_optional_recovery)
            .transpose()?
            .flatten()
    };
    bytes
        .map(|value| String::from_utf8(value).map_err(|_| "Legacy review log is not UTF-8".into()))
        .transpose()
}

fn resolve_note(root: &Path, raw: &str) -> Option<String> {
    let path = Path::new(raw);
    if !path.is_absolute()
        || path
            .components()
            .any(|part| matches!(part, Component::ParentDir))
    {
        return None;
    }
    let resolved = path
        .canonicalize()
        .or_else(|_| {
            let parent = path
                .parent()
                .ok_or_else(|| std::io::Error::from(std::io::ErrorKind::NotFound))?;
            parent
                .canonicalize()
                .map(|parent| parent.join(path.file_name().unwrap_or_default()))
        })
        .unwrap_or_else(|_| PathBuf::from(path));
    resolved
        .strip_prefix(root)
        .ok()
        .and_then(|relative| relative.to_str())
        .map(|relative| relative.replace(std::path::MAIN_SEPARATOR, "/"))
}

fn valid_row(row: &LogRow) -> Option<i64> {
    if !(1..=4).contains(&row.rating)
        || !["new", "learning", "review", "relearning"].contains(&row.state_before.as_str())
        || !row.scheduled_days.is_finite()
        || row.scheduled_days < 0.0
    {
        return None;
    }
    let milliseconds = row.ts.checked_mul(1000)?;
    chrono::DateTime::from_timestamp_millis(milliseconds).map(|_| milliseconds)
}

pub(super) fn parse_log(root: &Path, raw: &str) -> Result<ParsedLog, String> {
    let root = root.canonicalize().map_err(|error| error.to_string())?;
    let mut result = ParsedLog {
        reviews: Vec::new(),
        invalid: 0,
        unscoped: 0,
    };
    let mut occurrences = HashMap::new();
    for line in raw.lines().filter(|line| !line.trim().is_empty()) {
        let row = match serde_json::from_str::<LogRow>(line) {
            Ok(row) => row,
            Err(_) => {
                result.invalid += 1;
                continue;
            }
        };
        let Some(reviewed_at) = valid_row(&row) else {
            result.invalid += 1;
            continue;
        };
        let Some(note_path) = resolve_note(&root, &row.note_path) else {
            if !Path::new(&row.note_path).is_absolute() {
                result.unscoped += 1;
            }
            continue;
        };
        let hash = format!("{:x}", Sha256::digest(line.as_bytes()));
        let occurrence = occurrences.entry(hash.clone()).or_insert(0_u64);
        *occurrence += 1;
        result.reviews.push(LegacyReview {
            id: format!("legacy:{hash}:{occurrence}"),
            note_path,
            rating: row.rating,
            reviewed_at,
        });
    }
    Ok(result)
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReviewMap {
    format_version: u32,
    library_id: String,
    reviews: Vec<LegacyReview>,
    invalid: usize,
    unscoped: usize,
}

pub(super) fn captured_log(root: &Path, raw: Option<&str>) -> Result<ParsedLog, String> {
    reject_symlink(&root.join(".memnova"))?;
    let recovered = read_optional_recovery(&root.join(".memnova/legacy-review-map.json"))?;
    if let Some(bytes) = recovered {
        let map: ReviewMap = serde_json::from_slice(&bytes).map_err(|error| error.to_string())?;
        let library_id = super::identity::read_library_identity(&root.join(".memnova"))?;
        if map.format_version != 1 || map.library_id != library_id {
            return Err("Unsupported or mismatched legacy review map".into());
        }
        let mut ids = std::collections::HashSet::new();
        for review in &map.reviews {
            let path = Path::new(&review.note_path);
            if path.is_absolute()
                || path
                    .components()
                    .any(|part| !matches!(part, Component::Normal(_)))
                || review.note_path.is_empty()
                || !review.id.starts_with("legacy:")
                || !ids.insert(&review.id)
                || !(1..=4).contains(&review.rating)
                || chrono::DateTime::from_timestamp_millis(review.reviewed_at).is_none()
            {
                return Err("Invalid recovered legacy review".into());
            }
        }
        return Ok(ParsedLog {
            reviews: map.reviews,
            invalid: map.invalid,
            unscoped: map.unscoped,
        });
    }
    parse_log(root, raw.unwrap_or_default())
}

pub(super) fn capture_map(
    root: &Path,
    library_id: &str,
    raw: Option<&[u8]>,
) -> Result<Vec<u8>, String> {
    let raw = raw
        .map(std::str::from_utf8)
        .transpose()
        .map_err(|error| error.to_string())?;
    let parsed = captured_log(root, raw)?;
    serde_json::to_vec(&ReviewMap {
        format_version: 1,
        library_id: library_id.into(),
        reviews: parsed.reviews,
        invalid: parsed.invalid,
        unscoped: parsed.unscoped,
    })
    .map_err(|error| error.to_string())
}

pub(super) fn map_reviews(bytes: &[u8]) -> Result<Vec<LegacyReview>, String> {
    let map: ReviewMap = serde_json::from_slice(bytes).map_err(|error| error.to_string())?;
    Ok(map.reviews)
}
