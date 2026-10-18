use super::{
    cards::{insert_card, read_card},
    note_lifecycle::{NoteLearningState, NoteMemoryView},
    note_memory_view::memory_view,
    note_write::PreparedWrite,
    CardDraft, Schedule,
};
use rusqlite::Transaction;
use serde::{Deserialize, Serialize};
use std::path::Path;

fn desired_status(state: NoteLearningState) -> &'static str {
    match state {
        NoteLearningState::Ready => "active",
        NoteLearningState::Draft => "draft",
        _ => "suspended",
    }
}

fn update_bound(
    transaction: &Transaction<'_>,
    view: &NoteMemoryView,
    binding: &super::NoteBinding,
    status: &str,
) -> Result<Option<u32>, String> {
    let card = read_card(transaction, &binding.card_id)?;
    if card.status == "trashed" {
        return Err("bound-card-trashed".into());
    }
    let hash = view.source_hash.as_deref().unwrap_or(&binding.source_hash);
    if hash == binding.source_hash && card.status == status {
        return Ok(Some(binding.revision));
    }
    let revision = binding
        .revision
        .checked_add(1)
        .ok_or("Note revision overflow")?;
    let card_revision = card
        .revision
        .checked_add(1)
        .ok_or("Card revision overflow")?;
    transaction
        .execute(
            "UPDATE note_card_bindings SET source_hash=?1,revision=?2 WHERE page_id=?3",
            rusqlite::params![hash, revision, view.page_id],
        )
        .map_err(|error| error.to_string())?;
    transaction
        .execute(
            "UPDATE cards SET status=?1,revision=?2,updated_at=?3 WHERE id=?4",
            rusqlite::params![
                status,
                card_revision,
                chrono::Utc::now().timestamp_millis(),
                binding.card_id
            ],
        )
        .map_err(|error| error.to_string())?;
    Ok(Some(revision))
}

fn create_bound(
    transaction: &Transaction<'_>,
    view: &NoteMemoryView,
    status: &str,
) -> Result<Option<u32>, String> {
    if view.state == NoteLearningState::ConversionRequired || !view.identity_valid {
        return Ok(None);
    }
    if !view.config.as_ref().is_some_and(|config| config.enabled) {
        return Ok(None);
    }
    let Some(hash) = &view.source_hash else {
        return Ok(None);
    };
    let card_id = uuid::Uuid::new_v4().to_string();
    let draft = CardDraft {
        front: String::new(),
        back: String::new(),
        answer_mode: "inline".into(),
        answer_page_id: None,
        status: "draft".into(),
        position: 0,
        properties: serde_json::json!({}),
        property_definitions: None,
    };
    insert_card(
        transaction,
        &card_id,
        &view.page_id,
        &draft,
        &Schedule::fresh(),
    )?;
    transaction.execute("INSERT INTO note_card_bindings(page_id,card_id,source_hash,revision) VALUES(?1,?2,?3,0)", rusqlite::params![view.page_id,card_id,hash]).map_err(|error| error.to_string())?;
    transaction
        .execute(
            "UPDATE cards SET status=?1 WHERE id=?2",
            rusqlite::params![status, card_id],
        )
        .map_err(|error| error.to_string())?;
    Ok(Some(0))
}

pub(super) fn reconcile_in(
    transaction: &Transaction<'_>,
    view: &NoteMemoryView,
) -> Result<Option<u32>, String> {
    if view.state == NoteLearningState::Pending {
        return Err("pending-operation".into());
    }
    let status = desired_status(view.state);
    match &view.binding {
        Some(binding) => update_bound(transaction, view, binding, status),
        None => create_bound(transaction, view, status),
    }
}

pub(super) fn complete_memory_source(
    transaction: &Transaction<'_>,
    root: &Path,
    prepared: &PreparedWrite,
) -> Result<Option<u32>, String> {
    let view = memory_view(
        transaction,
        root,
        &prepared.page_id,
        Some(&prepared.operation_id),
    )?;
    if !view.identity_valid {
        return Err("identity-conflict".into());
    }
    if view.source_hash.as_deref() != Some(&prepared.after_hash) {
        return Err("changed-source".into());
    }
    if view.state == NoteLearningState::ConversionRequired {
        return Err("conversion-required".into());
    }
    reconcile_in(transaction, &view)
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ReconcileReceipt {
    pub version: u8,
    pub page_id: String,
    pub source_hash: Option<String>,
    pub before_revision: Option<u32>,
    pub revision: Option<u32>,
}

pub(super) fn record_reconcile(
    transaction: &Transaction<'_>,
    before: &NoteMemoryView,
    revision: Option<u32>,
) -> Result<(), String> {
    let before_revision = before.binding.as_ref().map(|binding| binding.revision);
    if revision == before_revision {
        return Ok(());
    }
    let payload = ReconcileReceipt {
        version: 1,
        page_id: before.page_id.clone(),
        source_hash: before.source_hash.clone(),
        before_revision,
        revision,
    };
    let payload = serde_json::to_string(&payload).map_err(|error| error.to_string())?;
    transaction.execute("INSERT INTO note_learning_operations(id,page_id,kind,payload_json,phase,created_at) VALUES(?1,?2,'reconcile',?3,'applied',?4)", rusqlite::params![uuid::Uuid::new_v4().to_string(),before.page_id,payload,chrono::Utc::now().timestamp_millis()]).map_err(|error| error.to_string())?;
    Ok(())
}

impl ReconcileReceipt {
    pub(super) fn validate(&self, owner: &str) -> Result<(), String> {
        uuid::Uuid::parse_str(owner).map_err(|_| "Invalid reconciliation owner")?;
        let next = match self.before_revision {
            Some(before) => before.checked_add(1),
            None => Some(0),
        };
        if self.version != 1
            || self.page_id != owner
            || self.revision.is_none()
            || self.revision != next
            || self
                .source_hash
                .as_ref()
                .is_some_and(|hash| !super::note_write_disk::valid_hash(hash))
            || (self.before_revision.is_none() && self.source_hash.is_none())
        {
            return Err("Invalid reconciliation receipt".into());
        }
        Ok(())
    }
}
