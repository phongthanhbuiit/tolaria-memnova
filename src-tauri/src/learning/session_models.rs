use super::{Card, Schedule};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SessionScope {
    pub page_ids: Option<Vec<String>>,
}

impl SessionScope {
    pub(super) fn normalize(&mut self) -> Result<(), String> {
        if let Some(ids) = &mut self.page_ids {
            for id in ids.iter() {
                uuid::Uuid::parse_str(id).map_err(|_| "Invalid study scope page identity")?;
            }
            ids.sort();
            ids.dedup();
        }
        Ok(())
    }
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct StoredQueue {
    pub ids: Vec<String>,
    pub initial_count: usize,
}

pub(super) struct SessionRow {
    pub id: String,
    pub scope: SessionScope,
    pub queue: StoredQueue,
    pub current_index: usize,
    pub status: String,
    pub revision: u32,
    pub updated_at: i64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudyPage {
    pub id: String,
    pub path: String,
    pub title: String,
    pub content: String,
    pub fingerprint: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudyItem {
    pub card: Card,
    pub page: Option<StudyPage>,
    pub answer_page: Option<StudyPage>,
    pub source_error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudySession {
    pub id: String,
    pub scope: SessionScope,
    pub initial_count: usize,
    pub current_index: usize,
    pub status: String,
    pub revision: u32,
    pub updated_at: i64,
    pub current: Option<StudyItem>,
    pub waiting_until: Option<i64>,
    pub completed_count: usize,
    pub review_count: usize,
    pub correct_count: usize,
    pub last_review_id: Option<String>,
    pub can_undo: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RateRequest {
    pub review_id: String,
    pub session_id: String,
    pub session_revision: u32,
    pub card_id: String,
    pub card_revision: u32,
    pub source_fingerprint: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub answer_fingerprint: Option<String>,
    pub rating: u8,
    pub duration_ms: u32,
    pub reviewed_at: i64,
    pub schedule: Schedule,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RateResult {
    pub session: StudySession,
    pub earned_xp: u32,
    pub replayed: bool,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ReviewBefore {
    pub schedule: Schedule,
    pub session_index: usize,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ReviewAfter {
    pub schedule: Schedule,
    pub request: RateRequest,
    pub reinserted: bool,
    pub earned_xp: u32,
}
