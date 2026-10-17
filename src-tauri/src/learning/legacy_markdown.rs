//! Read-only legacy Markdown inspection. Source strings are never serialized back.
use super::{CardDraft, Schedule};
use serde::{Deserialize, Serialize};
use serde_yaml::{Mapping, Value};
use std::path::Path;

const MARKER: &str = "<!-- FLASHCARD:BACK -->";

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyCard {
    pub draft: CardDraft,
    pub schedule: Schedule,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyPage {
    pub path: String,
    pub title: String,
    pub existing_id: Option<String>,
    pub fingerprint: String,
    pub card: Option<LegacyCard>,
}

pub(super) fn frontmatter(source: &str) -> Result<(Mapping, &str), String> {
    let candidate = source.strip_prefix('\u{feff}').unwrap_or(source);
    let Some(first_end) = candidate.find('\n') else {
        return Ok((Mapping::new(), candidate));
    };
    if candidate[..first_end].trim_end_matches('\r') != "---" {
        return Ok((Mapping::new(), candidate));
    }
    let mut offset = first_end + 1;
    for line in candidate[offset..].split_inclusive('\n') {
        if line.trim_end_matches(['\r', '\n']) == "---" {
            let raw = &candidate[first_end + 1..offset];
            let parsed: Value = serde_yaml::from_str(raw).map_err(|e| e.to_string())?;
            let mapping = match parsed {
                Value::Mapping(value) => value,
                Value::Null => Mapping::new(),
                _ => return Err("Frontmatter must be a mapping".into()),
            };
            if mapping.keys().any(|key| key.as_str().is_none()) {
                return Err("Frontmatter keys must be strings".into());
            }
            return Ok((mapping, &candidate[offset + line.len()..]));
        }
        offset += line.len();
    }
    Err("Frontmatter has no closing delimiter".into())
}

fn field<'a>(metadata: &'a Mapping, key: &str) -> Option<&'a Value> {
    metadata.get(Value::String(key.into()))
}

pub(super) fn page_id(metadata: &Mapping) -> Result<Option<String>, String> {
    field(metadata, "_memnova_page_id")
        .map(|value| {
            let text = value
                .as_str()
                .ok_or("Page identity must be a UUID string")?;
            uuid::Uuid::parse_str(text)
                .map(|id| id.to_string())
                .map_err(|_| "Invalid page identity".into())
        })
        .transpose()
}

pub(super) fn title(metadata: &Mapping, source: &str, path: &str) -> String {
    let filename = Path::new(path)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or(path);
    crate::vault::title_from_markdown(
        field(metadata, "title").and_then(Value::as_str),
        source,
        filename,
    )
}

fn enabled(metadata: &Mapping) -> Result<bool, String> {
    let Some(value) = field(metadata, "_fsrs_enabled") else {
        return Ok(false);
    };
    if let Some(value) = value.as_bool() {
        return Ok(value);
    }
    if let Some(value) = value.as_i64() {
        return Ok(value != 0);
    }
    if let Some(value) = value.as_str() {
        return match value.to_lowercase().as_str() {
            "true" | "yes" | "1" => Ok(true),
            "false" | "no" | "0" | "" => Ok(false),
            _ => Err("Unrecognized FSRS activation flag".into()),
        };
    }
    if value.is_null() {
        return Ok(false);
    }
    Err("Invalid FSRS activation flag".into())
}

fn number(metadata: &Mapping, key: &str) -> Result<f64, String> {
    match field(metadata, key) {
        None | Some(Value::Null) => Ok(0.0),
        Some(value) => value
            .as_f64()
            .or_else(|| value.as_str().and_then(|text| text.parse().ok()))
            .filter(|value| value.is_finite() && *value >= 0.0)
            .ok_or_else(|| format!("Invalid {key}")),
    }
}

fn count(metadata: &Mapping, key: &str) -> Result<u32, String> {
    let value = number(metadata, key)?;
    if value.fract() != 0.0 || value > u32::MAX as f64 {
        return Err(format!("Invalid {key}"));
    }
    Ok(value as u32)
}

fn optional_text(metadata: &Mapping, key: &str) -> Result<Option<String>, String> {
    match field(metadata, key) {
        None | Some(Value::Null) => Ok(None),
        Some(value) => value
            .as_str()
            .map(|text| Some(text.to_string()))
            .ok_or_else(|| format!("Invalid {key}")),
    }
}

pub(super) fn schedule(metadata: &Mapping) -> Result<Schedule, String> {
    let mut result = Schedule::fresh();
    result.reps = count(metadata, "_fsrs_reps")?;
    result.lapses = count(metadata, "_fsrs_lapses")?;
    result.state = optional_text(metadata, "_fsrs_state")?.unwrap_or_else(|| "new".into());
    result.stability = number(metadata, "_fsrs_stability")?;
    result.difficulty = number(metadata, "_fsrs_difficulty")?;
    result.elapsed_days = number(metadata, "_fsrs_elapsed_days")?;
    result.scheduled_days = number(metadata, "_fsrs_scheduled_days")?;
    result.last_review = optional_text(metadata, "_fsrs_last_review")?;
    if let Some(due) = optional_text(metadata, "_fsrs_due")? {
        result.due = due;
    } else if result.state != "new" || result.reps > 0 {
        return Err("A learned card is missing its due date".into());
    }
    if result.state == "new" && result.reps > 0 {
        return Err("A learned card is missing its scheduler state".into());
    }
    result.validate()?;
    Ok(result)
}

pub(super) fn card(
    metadata: &Mapping,
    body: &str,
    page_title: &str,
) -> Result<Option<LegacyCard>, String> {
    let is_enabled = enabled(metadata)?;
    let has_schedule = [
        "_fsrs_state",
        "_fsrs_due",
        "_fsrs_stability",
        "_fsrs_difficulty",
        "_fsrs_elapsed_days",
        "_fsrs_scheduled_days",
        "_fsrs_reps",
        "_fsrs_lapses",
        "_fsrs_last_review",
    ]
    .iter()
    .any(|key| field(metadata, key).is_some());
    let split = body.split_once(MARKER);
    if !is_enabled && !has_schedule && split.is_none() {
        return Ok(None);
    }
    let (front, back, answer_mode) = match split {
        Some((front, back)) => (
            front.trim_end_matches(['\r', '\n']).to_string(),
            back.trim_start_matches(['\r', '\n']).to_string(),
            "inline",
        ),
        None => (page_title.to_string(), String::new(), "page"),
    };
    let mut draft = CardDraft {
        front,
        back,
        answer_mode: answer_mode.into(),
        status: "draft".into(),
        position: 0,
        properties: card_properties(metadata)?,
    };
    draft.status = card_status(is_enabled, has_schedule, &draft).into();
    draft.validate()?;
    Ok(Some(LegacyCard {
        draft,
        schedule: schedule(metadata)?,
    }))
}

fn card_status(is_enabled: bool, has_schedule: bool, draft: &CardDraft) -> &'static str {
    if !is_enabled {
        return if has_schedule { "suspended" } else { "draft" };
    }
    if draft.front.trim().is_empty()
        || (draft.answer_mode == "inline" && draft.back.trim().is_empty())
    {
        "draft"
    } else {
        "active"
    }
}

fn card_properties(metadata: &Mapping) -> Result<serde_json::Value, String> {
    let mut properties = serde_json::Map::new();
    for (key, value) in metadata {
        if let Some(key) = key.as_str().filter(|key| !key.starts_with('_')) {
            properties.insert(
                key.into(),
                serde_json::to_value(value).map_err(|error| error.to_string())?,
            );
        }
    }
    Ok(serde_json::Value::Object(properties))
}
