use super::{note_memory::MemoryConfig, Card};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NoteConversionCandidate {
    pub card: Card,
    pub properties_raw: String,
    pub review_count: u32,
    pub undone_review_count: u32,
    pub storage_fingerprint: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NoteConversionPage {
    pub page_id: Option<String>,
    pub path: String,
    pub title: String,
    pub source_hash: Option<String>,
    pub front: String,
    pub back: Option<String>,
    pub properties_raw: String,
    pub config: Option<MemoryConfig>,
    pub classification: String,
    pub issues: Vec<String>,
    pub candidates: Vec<NoteConversionCandidate>,
    pub suggested_reuse_card_id: Option<String>,
    pub page_storage_fingerprint: String,
    pub session_fingerprint: String,
    pub active_session_count: u32,
    pub media: Vec<super::NoteMediaDependency>,
    pub fingerprint: String,
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteConversionPreview {
    pub version: u8,
    pub library_id: Option<String>,
    pub schema_version: Option<u32>,
    pub state: String,
    pub pages: Vec<NoteConversionPage>,
    pub fingerprint: String,
}
