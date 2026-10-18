use super::{
    note_conversion_models::{NoteConversionCandidate, NoteConversionPage},
    note_memory::MemoryFace,
    note_write::NoteWriteOutcome,
    NoteFacePreview, NoteMediaDependency, NoteOperationPhase, Schedule,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum ConversionFaceChoice {
    Markdown {},
    Card { card_id: String },
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum ConversionBackChoice {
    Inline { source: ConversionFaceChoice },
    Page { page_id: String, face: MemoryFace },
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum ConversionMemoryChoice {
    Reuse {
        card_id: String,
        confirmed_same_goal: bool,
    },
    Fresh {},
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NoteConversionRequest {
    pub operation_id: String,
    pub page_id: String,
    pub expected_fingerprint: String,
    pub front: ConversionFaceChoice,
    pub back: ConversionBackChoice,
    pub memory: ConversionMemoryChoice,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteConversionResult {
    pub outcome: NoteWriteOutcome,
    pub backup_id: String,
    pub card_id: String,
    pub retained_legacy_cards: usize,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteConversionDetails {
    pub operation_id: String,
    pub page_id: String,
    pub phase: NoteOperationPhase,
    pub backup_id: String,
    pub card_id: String,
    pub before_source: String,
    pub after_source: String,
    pub legacy_cards: Vec<NoteConversionCandidate>,
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ConversionSources {
    pub front_media: Vec<NoteMediaDependency>,
    pub back_media: Vec<NoteMediaDependency>,
    pub linked: Option<NoteFacePreview>,
    pub ready: bool,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ConversionIntent {
    pub version: u8,
    pub request: NoteConversionRequest,
    pub backup_id: String,
    pub card_id: String,
    pub schedule: Schedule,
    pub before_source: String,
    pub before_page: NoteConversionPage,
    pub sources: ConversionSources,
    pub timestamp: i64,
}
impl ConversionIntent {
    pub fn result(&self, outcome: NoteWriteOutcome) -> NoteConversionResult {
        NoteConversionResult {
            outcome,
            backup_id: self.backup_id.clone(),
            card_id: self.card_id.clone(),
            retained_legacy_cards: self.before_page.candidates.len()
                - usize::from(matches!(
                    self.request.memory,
                    ConversionMemoryChoice::Reuse { .. }
                )),
        }
    }
    pub fn validate(&self, prepared: &super::note_write::PreparedWrite) -> Result<(), String> {
        for id in [&self.backup_id, &self.card_id] {
            uuid::Uuid::parse_str(id).map_err(|_| "invalid-conversion-identity")?;
        }
        self.schedule.validate()?;
        self.validate_snapshot(prepared)?;
        let expected = super::note_conversion_source::selected_document(
            &self.before_source,
            &self.before_page,
            &self.request,
        )?;
        if prepared.after_source.as_deref() != Some(expected.as_str()) {
            return Err("conversion-source-checkpoint-mismatch".into());
        }
        self.validate_memory()?;
        Ok(())
    }
    fn validate_snapshot(&self, prepared: &super::note_write::PreparedWrite) -> Result<(), String> {
        let mut page = self.before_page.clone();
        let fingerprint = std::mem::take(&mut page.fingerprint);
        if self.version != 1
            || fingerprint
                != super::migration_plan::content_hash(
                    &serde_json::to_string(&page).map_err(|error| error.to_string())?,
                )
            || self.request.expected_fingerprint != fingerprint
            || self.request.operation_id != prepared.operation_id
            || self.request.page_id != prepared.page_id
            || self.before_page.page_id.as_deref() != Some(&prepared.page_id)
            || self.before_page.path != prepared.path
            || prepared.expected_revision.is_some()
            || prepared.configuration.is_some()
            || self.timestamp < 0
            || chrono::DateTime::<chrono::Utc>::from_timestamp_millis(self.timestamp).is_none()
            || super::migration_plan::content_hash(&self.before_source) != prepared.before_hash
        {
            return Err("invalid-conversion-checkpoint".into());
        }
        Ok(())
    }
    fn validate_memory(&self) -> Result<(), String> {
        match &self.request.memory {
            ConversionMemoryChoice::Reuse {
                card_id,
                confirmed_same_goal,
            } => {
                let original =
                    super::note_conversion_source::selected_card(&self.before_page, card_id)?;
                if !confirmed_same_goal
                    || &self.card_id != card_id
                    || self.schedule != original.card.schedule
                {
                    return Err("conversion-memory-checkpoint-mismatch".into());
                }
            }
            ConversionMemoryChoice::Fresh {} => {
                if self
                    .before_page
                    .candidates
                    .iter()
                    .any(|candidate| candidate.card.id == self.card_id)
                    || self.schedule.state != "new"
                    || self.schedule.reps != 0
                    || self.schedule.lapses != 0
                    || self.schedule.revision != 0
                {
                    return Err("conversion-fresh-memory-checkpoint-mismatch".into());
                }
            }
        }
        Ok(())
    }
}
