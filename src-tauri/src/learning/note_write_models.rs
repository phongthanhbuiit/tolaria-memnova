use super::migration_plan::content_hash;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NoteWriteRequest {
    pub operation_id: String,
    pub page_id: String,
    pub expected_hash: String,
    #[serde(deserialize_with = "required_revision")]
    pub expected_revision: Option<u32>,
    pub source: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NoteWriteStatus {
    Committed,
    Pending,
    Conflict,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NoteWriteOutcome {
    pub operation_id: String,
    pub page_id: String,
    pub status: NoteWriteStatus,
    pub source_hash: String,
    pub revision: Option<u32>,
    pub problem: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PreparedWrite {
    pub version: u8,
    pub operation_id: String,
    pub page_id: String,
    pub path: String,
    pub before_hash: String,
    pub after_hash: String,
    pub expected_revision: Option<u32>,
    pub intent_hash: String,
    pub after_source: Option<String>,
    pub outcome: Option<NoteWriteOutcome>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub configuration: Option<super::note_memory::MemoryConfig>,
}

impl PreparedWrite {
    pub(super) fn outcome(
        &self,
        status: NoteWriteStatus,
        problem: Option<String>,
    ) -> NoteWriteOutcome {
        NoteWriteOutcome {
            operation_id: self.operation_id.clone(),
            page_id: self.page_id.clone(),
            status,
            source_hash: self.after_hash.clone(),
            revision: None,
            problem,
        }
    }

    pub(super) fn validate(&self) -> Result<(), String> {
        if self.version != 1
            || self.path.is_empty()
            || ![&self.before_hash, &self.after_hash, &self.intent_hash]
                .iter()
                .all(|hash| super::note_write_disk::valid_hash(hash))
        {
            return Err("Invalid note operation checkpoint; existing data was preserved".into());
        }
        for id in [&self.operation_id, &self.page_id] {
            uuid::Uuid::parse_str(id).map_err(|_| "Invalid note operation identity")?;
        }
        if self
            .configuration
            .as_ref()
            .is_some_and(|config| !config.valid())
        {
            return Err("Invalid configuration checkpoint".into());
        }
        if let Some(source) = &self.after_source {
            if content_hash(source) != self.after_hash {
                return Err("Note operation source checksum mismatch".into());
            }
            validate_source(source, &self.page_id)?;
            if self.configuration.is_some()
                && super::note_memory::parse_document(source).config != self.configuration
            {
                return Err("Configuration checkpoint mismatch".into());
            }
        }
        if let Some(outcome) = &self.outcome {
            if outcome.operation_id != self.operation_id
                || outcome.page_id != self.page_id
                || outcome.source_hash != self.after_hash
                || outcome.status != NoteWriteStatus::Committed
            {
                return Err("Invalid note operation receipt".into());
            }
        }
        Ok(())
    }
}

pub(super) fn validate_source(source: &str, id: &str) -> Result<(), String> {
    let document = super::note_memory::parse_document(source);
    if !document.issues.is_empty() || document.page_id.as_deref() != Some(id) {
        return Err("Invalid or changed note identity/configuration".into());
    }
    Ok(())
}

pub(super) fn required_revision<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<u32>, D::Error> {
    Option::deserialize(deserializer)
}
