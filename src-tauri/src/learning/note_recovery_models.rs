use super::{
    migration_plan::content_hash,
    note_write::{NoteWriteOutcome, NoteWriteStatus, PreparedWrite},
    NoteOperationKind, NoteOperationPhase,
};
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RecoveryChoice {
    KeepDisk,
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NoteRecoveryRequest {
    pub operation_id: String,
    #[serde(deserialize_with = "required_hash")]
    pub expected_current_hash: Option<String>,
    pub choice: RecoveryChoice,
}
fn required_hash<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<String>, D::Error> {
    Option::deserialize(deserializer)
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteRecoverySummary {
    pub operation_id: String,
    pub page_id: Option<String>,
    pub kind: NoteOperationKind,
    pub phase: NoteOperationPhase,
    pub created_at: i64,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteRecoveryView {
    pub operation_id: String,
    pub page_id: String,
    pub phase: NoteOperationPhase,
    pub draft_source: Option<String>,
    pub before_source: Option<String>,
    pub current_path: Option<String>,
    pub current_source: Option<String>,
    pub current_hash: Option<String>,
    pub source_error: Option<String>,
    pub kept_source: Option<String>,
    pub outcome: Option<NoteWriteOutcome>,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct NoteResolution {
    pub version: u8,
    pub request: NoteRecoveryRequest,
    pub current_path: Option<String>,
    pub current_source: Option<String>,
    pub current_hash: Option<String>,
    pub before_revision: Option<u32>,
    pub revision: Option<u32>,
    pub resolved_at: i64,
}
impl NoteResolution {
    pub fn validate(&self, prepared: &PreparedWrite) -> Result<(), String> {
        if self.version != 1
            || self.request.operation_id != prepared.operation_id
            || self.current_hash
                != self
                    .current_source
                    .as_ref()
                    .map(|source| content_hash(source))
            || self.request.expected_current_hash != self.current_hash
            || (self.current_source.is_some() && self.current_path.is_none())
            || match self.before_revision {
                Some(before) => {
                    self.revision != Some(before) && self.revision != before.checked_add(1)
                }
                None => self.revision.is_some(),
            }
            || self.resolved_at < 0
            || chrono::DateTime::<chrono::Utc>::from_timestamp_millis(self.resolved_at).is_none()
            || prepared.after_source.is_none()
            || !prepared.outcome.as_ref().is_some_and(|outcome| {
                outcome.status == NoteWriteStatus::Discarded && outcome.revision == self.revision
            })
        {
            return Err("invalid-note-resolution-receipt".into());
        }
        if let Some(path) = &self.current_path {
            super::note_write_models::validate_historical_path(path)?;
        }
        Ok(())
    }
}
#[derive(Clone, Default, PartialEq, Eq)]
pub(super) struct CurrentSource {
    pub path: Option<String>,
    pub source: Option<String>,
    pub hash: Option<String>,
}
