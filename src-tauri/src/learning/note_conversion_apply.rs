use super::{
    note_conversion_cards::{candidates, page_storage_fingerprint, sessions},
    note_conversion_intent::{ConversionIntent, ConversionMemoryChoice},
    note_conversion_source::{selected_card, selected_sources},
    note_write::{NoteWriteHooks, NoteWriteRequest, PreparedWrite},
    NoteConversionDetails, NoteConversionRequest, NoteConversionResult, Store,
};
use rusqlite::{Connection, OptionalExtension, Transaction};
use std::{path::Path, sync::Mutex};

static CONVERSION_PREPARATION: Mutex<()> = Mutex::new(());

pub(super) fn conversion_sources_match(
    connection: &Connection,
    root: &Path,
    prepared: &PreparedWrite,
) -> bool {
    let Some(intent) = &prepared.conversion else {
        return false;
    };
    let Some(source) = &prepared.after_source else {
        return false;
    };
    selected_sources(
        connection,
        root,
        &prepared.path,
        source,
        &intent.request.back,
    )
    .is_ok_and(|sources| sources == intent.sources)
}
pub(super) fn conversion_inputs_match(
    connection: &Connection,
    root: &Path,
    prepared: &PreparedWrite,
) -> Result<bool, String> {
    let intent = prepared
        .conversion
        .as_ref()
        .ok_or("not-a-conversion-operation")?;
    if !super::pages::source_ids(root).is_ok_and(|sources| {
        sources
            .get(&prepared.page_id)
            .is_some_and(|(path, _)| path == &prepared.path)
    }) {
        return Ok(false);
    }
    let original = &intent.before_page;
    let cards = candidates(connection, &prepared.page_id)?;
    let expected: Vec<_> = original
        .candidates
        .iter()
        .map(|card| (&card.card.id, &card.storage_fingerprint))
        .collect();
    let current: Vec<_> = cards
        .iter()
        .map(|card| (&card.card.id, &card.storage_fingerprint))
        .collect();
    let (session_fingerprint, active) = sessions(connection, &prepared.page_id)?;
    Ok(expected == current
        && active == 0
        && session_fingerprint == original.session_fingerprint
        && page_storage_fingerprint(connection, &prepared.page_id)?
            == original.page_storage_fingerprint
        && conversion_sources_match(connection, root, prepared))
}
fn insert_fresh_card(
    transaction: &Transaction<'_>,
    intent: &ConversionIntent,
    owner: &str,
    status: &str,
) -> Result<(), String> {
    let draft = super::CardDraft {
        front: String::new(),
        back: String::new(),
        answer_mode: "inline".into(),
        answer_page_id: None,
        status: "draft".into(),
        position: 0,
        properties: serde_json::json!({}),
        property_definitions: None,
    };
    super::cards::insert_card(
        transaction,
        &intent.card_id,
        owner,
        &draft,
        &intent.schedule,
    )?;
    transaction
        .execute(
            "UPDATE cards SET status=?1,created_at=?2,updated_at=?2 WHERE id=?3",
            rusqlite::params![status, intent.timestamp, intent.card_id],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}
fn complete_conversion(
    transaction: &Transaction<'_>,
    root: &Path,
    prepared: &PreparedWrite,
) -> Result<Option<u32>, String> {
    if !conversion_inputs_match(transaction, root, prepared)? {
        return Err("conversion-inputs-changed".into());
    }
    let intent = prepared
        .conversion
        .as_ref()
        .ok_or("not-a-conversion-operation")?;
    let status = if intent.sources.ready {
        "active"
    } else {
        "draft"
    };
    match &intent.request.memory {
        ConversionMemoryChoice::Fresh {} => {
            insert_fresh_card(transaction, intent, &prepared.page_id, status)?;
        }
        ConversionMemoryChoice::Reuse { card_id, .. } => {
            let card = selected_card(&intent.before_page, card_id)?;
            let revision = card
                .card
                .revision
                .checked_add(1)
                .ok_or("conversion-card-revision-overflow")?;
            let count = transaction.execute("UPDATE cards SET status=?1,revision=?2,updated_at=?3 WHERE id=?4 AND revision=?5",rusqlite::params![status,revision,intent.timestamp,card_id,card.card.revision]).map_err(|error|error.to_string())?;
            if count != 1 {
                return Err("conversion-card-changed".into());
            }
        }
    }
    transaction.execute("INSERT INTO note_card_bindings(page_id,card_id,source_hash,revision) VALUES(?1,?2,?3,0)",rusqlite::params![prepared.page_id,intent.card_id,prepared.after_hash]).map_err(|error|error.to_string())?;
    Ok(Some(0))
}
fn validate_request(request: &NoteConversionRequest) -> Result<(), String> {
    for id in [&request.operation_id, &request.page_id] {
        uuid::Uuid::parse_str(id).map_err(|_| "invalid-conversion-identity")?;
    }
    if !super::note_write_disk::valid_hash(&request.expected_fingerprint) {
        return Err("invalid-conversion-fingerprint".into());
    }
    if matches!(
        request.memory,
        ConversionMemoryChoice::Reuse {
            confirmed_same_goal: false,
            ..
        }
    ) {
        return Err("confirm-same-learning-goal".into());
    }
    Ok(())
}
impl Store {
    pub fn apply_note_conversion(
        &mut self,
        request: NoteConversionRequest,
    ) -> Result<NoteConversionResult, String> {
        self.apply_note_conversion_with_hooks(request, &NoteWriteHooks::default())
    }
    pub(super) fn apply_note_conversion_with_hooks(
        &mut self,
        request: NoteConversionRequest,
        hooks: &NoteWriteHooks,
    ) -> Result<NoteConversionResult, String> {
        let _preparation = CONVERSION_PREPARATION
            .lock()
            .map_err(|error| error.to_string())?;
        self.require_learning_ready()?;
        validate_request(&request)?;
        if let Some(prepared) = self.load_note_write(&request.operation_id)? {
            if prepared.conversion.as_ref().map(|intent| &intent.request) != Some(&request) {
                return Err("operation-has-different-conversion-intent".into());
            }
            return self.resume_note_conversion(&request.operation_id);
        }
        let (write, intent) = self.prepare_conversion(request)?;
        let result_intent = intent.clone();
        let root = self.root.clone();
        let outcome = self.write_note_conversion(
            write,
            intent,
            |transaction, prepared| complete_conversion(transaction, &root, prepared),
            hooks,
        )?;
        Ok(result_intent.result(outcome))
    }
    fn prepare_conversion(
        &self,
        request: NoteConversionRequest,
    ) -> Result<(NoteWriteRequest, ConversionIntent), String> {
        let selected = super::note_conversion_source::prepare_selection(self, &request)?;
        let super::note_conversion_source::SelectedConversion {
            page,
            before,
            after,
            sources,
            card_id,
            schedule,
        } = selected;
        let backup = self.create_backup()?;
        self.verify_backup(&backup.id)?;
        let write = NoteWriteRequest {
            operation_id: request.operation_id.clone(),
            page_id: request.page_id.clone(),
            expected_hash: page
                .source_hash
                .clone()
                .ok_or("missing-conversion-source-hash")?,
            expected_revision: None,
            source: after,
        };
        let intent = ConversionIntent {
            version: 1,
            request,
            backup_id: backup.id,
            card_id,
            schedule,
            before_source: before,
            before_page: page,
            sources,
            timestamp: chrono::Utc::now().timestamp_millis(),
        };
        Ok((write, intent))
    }
    pub fn resume_note_conversion(&mut self, id: &str) -> Result<NoteConversionResult, String> {
        self.require_learning_ready()?;
        let prepared = self
            .load_note_write(id)?
            .ok_or("missing-conversion-operation")?;
        let intent = prepared
            .conversion
            .as_ref()
            .ok_or("not-a-conversion-operation")?
            .clone();
        let root = self.root.clone();
        let outcome = self.resume_note_write(id, |transaction, prepared| {
            complete_conversion(transaction, &root, prepared)
        })?;
        Ok(intent.result(outcome))
    }
    pub fn note_compatibility(
        &self,
        page_id: &str,
    ) -> Result<Option<NoteConversionDetails>, String> {
        let Some(binding) = self.note_binding(page_id)? else {
            return Ok(None);
        };
        let operation: Option<String> = self.conn.query_row("SELECT id FROM note_learning_operations WHERE page_id=?1 AND kind='convert' AND phase='applied' ORDER BY created_at DESC,id DESC LIMIT 1",[page_id],|row|row.get(0)).optional().map_err(|error|error.to_string())?;
        let details = operation
            .map(|id| self.note_conversion_details(&id))
            .transpose()?;
        Ok(details.filter(|details| details.card_id == binding.card_id))
    }
    pub fn note_conversion_details(&self, id: &str) -> Result<NoteConversionDetails, String> {
        let prepared = self
            .load_note_write(id)?
            .ok_or("missing-conversion-operation")?;
        let intent = prepared.conversion.ok_or("not-a-conversion-operation")?;
        let phase: String = self
            .conn
            .query_row(
                "SELECT phase FROM note_learning_operations WHERE id=?1",
                [id],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        Ok(NoteConversionDetails {
            operation_id: id.into(),
            page_id: prepared.page_id,
            phase: serde_json::from_value(serde_json::Value::String(phase))
                .map_err(|error| error.to_string())?,
            backup_id: intent.backup_id,
            card_id: intent.card_id,
            before_source: intent.before_source,
            after_source: prepared
                .after_source
                .ok_or("missing-conversion-after-snapshot")?,
            legacy_cards: intent.before_page.candidates,
        })
    }
}
