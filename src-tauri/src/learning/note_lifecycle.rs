use super::{
    note_memory::MemoryConfig,
    note_memory_view::memory_view,
    note_reconcile::{complete_memory_source, reconcile_in, record_reconcile},
    note_write::{NoteWriteOutcome, NoteWriteRequest},
    NoteBinding, Schedule, Store,
};
use rusqlite::TransactionBehavior;
use serde::Serialize;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum NoteLearningState {
    Ordinary,
    Retained,
    Disabled,
    Draft,
    Ready,
    Invalid,
    Deleted,
    ConversionRequired,
    Pending,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteMemoryView {
    pub page_id: String,
    pub path: String,
    pub source_hash: Option<String>,
    pub config: Option<MemoryConfig>,
    pub has_back: bool,
    pub state: NoteLearningState,
    pub binding: Option<NoteBinding>,
    pub schedule: Option<Schedule>,
    pub legacy_card_count: u32,
    pub diagnostics: Vec<String>,
    pub pending_operations: Vec<super::note_storage::NoteOperationSummary>,
    #[serde(skip)]
    pub(super) identity_valid: bool,
}

impl Store {
    pub fn read_note_memory(&self, page_id: &str) -> Result<NoteMemoryView, String> {
        memory_view(&self.conn, &self.root, page_id, None)
    }

    pub fn save_note_memory(
        &mut self,
        request: NoteWriteRequest,
    ) -> Result<NoteWriteOutcome, String> {
        self.require_learning_ready()?;
        if self.load_note_write(&request.operation_id)?.is_none()
            && !self.read_note_memory(&request.page_id)?.identity_valid
        {
            return Err("identity-conflict".into());
        }
        let root = self.root.clone();
        self.write_note_source(request, |transaction, prepared| {
            complete_memory_source(transaction, &root, prepared)
        })
    }

    pub fn resume_note_memory(&mut self, operation_id: &str) -> Result<NoteWriteOutcome, String> {
        self.require_learning_ready()?;
        if self
            .load_note_write(operation_id)?
            .is_some_and(|prepared| prepared.conversion.is_some())
        {
            return self
                .resume_note_conversion(operation_id)
                .map(|result| result.outcome);
        }
        let root = self.root.clone();
        self.resume_note_write(operation_id, |transaction, prepared| {
            complete_memory_source(transaction, &root, prepared)
        })
    }

    pub fn reconcile_note_memory(&mut self, page_id: &str) -> Result<NoteMemoryView, String> {
        self.require_learning_ready()?;
        let _operation = super::migration_import::MIGRATION_OPERATION
            .lock()
            .map_err(|error| error.to_string())?;
        let transaction = self
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        let before = memory_view(&transaction, &self.root, page_id, None)?;
        if before.state == NoteLearningState::Pending {
            return Err("pending-operation".into());
        }
        let revision = reconcile_in(&transaction, &before)?;
        record_reconcile(&transaction, &before, revision)?;
        if let Some(hash) = &before.source_hash {
            if super::note_write_disk::current_hash(&self.root, &before.path).as_deref()
                != Ok(hash.as_str())
            {
                return Err("source-changed-during-reconcile".into());
            }
        }
        transaction.commit().map_err(|error| error.to_string())?;
        self.read_note_memory(page_id)
    }
}
