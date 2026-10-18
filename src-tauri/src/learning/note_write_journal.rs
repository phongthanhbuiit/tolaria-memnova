use super::{
    migration_plan::content_hash,
    note_write_models::{validate_source, NoteWriteRequest, PreparedWrite},
    NoteOperationPhase, Store,
};
use rusqlite::OptionalExtension;

pub(super) fn write_payload(
    connection: &rusqlite::Connection,
    prepared: &PreparedWrite,
    phase: NoteOperationPhase,
) -> Result<(), String> {
    prepared.validate()?;
    let payload = serde_json::to_string(prepared).map_err(|error| error.to_string())?;
    let (previous_phase, previous_payload): (String, String) = connection
        .query_row(
            "SELECT phase,payload_json FROM note_learning_operations WHERE id=?1",
            [&prepared.operation_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|error| error.to_string())?;
    if previous_phase == "applied" {
        if phase != NoteOperationPhase::Applied {
            return Err("Note operation already completed; reload its receipt".into());
        }
        if previous_payload == payload {
            return Ok(());
        }
        let mut previous: PreparedWrite =
            serde_json::from_str(&previous_payload).map_err(|error| error.to_string())?;
        previous.validate()?;
        // A terminal receipt is immutable. Only the existing save compaction is permitted.
        if previous.conversion.is_some() || previous.resolution.is_some() {
            return Err("Note operation already completed; reload its receipt".into());
        }
        previous.after_source = None;
        if serde_json::to_string(&previous).map_err(|error| error.to_string())? != payload {
            return Err("Note operation already completed; reload its receipt".into());
        }
    }
    let count = connection.execute(
        "UPDATE note_learning_operations SET payload_json=?1,phase=?2 WHERE id=?3 AND phase=?4 AND payload_json=?5",
        rusqlite::params![payload, phase.as_str(), prepared.operation_id, previous_phase, previous_payload],
    ).map_err(|error| error.to_string())?;
    if count != 1 {
        return Err("Note operation checkpoint changed; reload before retrying".into());
    }
    Ok(())
}

impl Store {
    pub(super) fn load_note_write(&self, id: &str) -> Result<Option<PreparedWrite>, String> {
        let row: Option<(String, String, Option<String>, String)> = self
            .conn
            .query_row(
                "SELECT payload_json,kind,page_id,phase FROM note_learning_operations WHERE id=?1",
                [id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .optional()
            .map_err(|error| error.to_string())?;
        row.map(|(payload, kind, owner, phase)| {
            decode_note_write(id, owner.as_deref(), &kind, &phase, &payload)
        })
        .transpose()
    }

    pub(super) fn prepare_note_write(
        &mut self,
        request: NoteWriteRequest,
        configuration: Option<super::note_memory::MemoryConfig>,
        conversion: Option<super::note_conversion_intent::ConversionIntent>,
    ) -> Result<PreparedWrite, String> {
        validate_write_request(&request)?;
        let intent_hash =
            content_hash(&serde_json::to_string(&request).map_err(|error| error.to_string())?);
        if let Some(prepared) = self.load_note_write(&request.operation_id)? {
            let context = serde_json::to_string(&conversion).map_err(|error| error.to_string())?;
            if prepared.intent_hash != intent_hash
                || prepared.configuration != configuration
                || serde_json::to_string(&prepared.conversion).map_err(|error| error.to_string())?
                    != context
            {
                return Err("Operation identity has a different immutable intent".into());
            }
            return Ok(prepared);
        }
        validate_source(&request.source, &request.page_id)?;
        let transaction = self
            .conn
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        let prepared = prepare_checkpoint(
            &transaction,
            &self.root,
            request,
            configuration,
            conversion,
            intent_hash,
        )?;
        let kind = if prepared.conversion.is_some() {
            "convert"
        } else if prepared.configuration.is_some() {
            "configure"
        } else {
            "save"
        };
        transaction.execute("INSERT INTO note_learning_operations(id,page_id,kind,payload_json,phase,created_at) VALUES(?1,?2,?3,?4,'prepared',?5)", rusqlite::params![prepared.operation_id,prepared.page_id,kind,serde_json::to_string(&prepared).map_err(|error|error.to_string())?,chrono::Utc::now().timestamp_millis()]).map_err(|error|error.to_string())?;
        transaction.commit().map_err(|error| error.to_string())?;
        Ok(prepared)
    }
}

fn prepare_checkpoint(
    connection: &rusqlite::Connection,
    root: &std::path::Path,
    request: NoteWriteRequest,
    configuration: Option<super::note_memory::MemoryConfig>,
    conversion: Option<super::note_conversion_intent::ConversionIntent>,
    intent_hash: String,
) -> Result<PreparedWrite, String> {
    let (path, before) =
        super::note_memory_view::read_note_source(connection, root, &request.page_id)?;
    if content_hash(&before) != request.expected_hash {
        return Err("Note source changed; reload before saving".into());
    }
    if super::note_storage::read_note_binding(connection, &request.page_id)?
        .map(|binding| binding.revision)
        != request.expected_revision
    {
        return Err("Note learning revision changed; reload before saving".into());
    }
    super::note_guard::require_note_page_writable(connection, &request.page_id)?;
    let prepared = PreparedWrite {
        version: 1,
        operation_id: request.operation_id,
        page_id: request.page_id,
        path,
        before_hash: request.expected_hash,
        after_hash: content_hash(&request.source),
        expected_revision: request.expected_revision,
        intent_hash,
        after_source: Some(request.source),
        outcome: None,
        configuration,
        conversion,
        resolution: None,
    };
    prepared.validate()?;
    if prepared.conversion.is_some()
        && !super::note_conversion_apply::conversion_inputs_match(connection, root, &prepared)?
    {
        return Err("conversion-preview-changed".into());
    }
    Ok(prepared)
}

fn validate_write_request(request: &NoteWriteRequest) -> Result<(), String> {
    for id in [&request.operation_id, &request.page_id] {
        uuid::Uuid::parse_str(id).map_err(|_| "Invalid note write identity")?;
    }
    if !super::note_write_disk::valid_hash(&request.expected_hash) {
        return Err("Invalid expected source fingerprint".into());
    }
    Ok(())
}

pub(super) fn decode_note_write(
    id: &str,
    owner: Option<&str>,
    kind: &str,
    phase: &str,
    payload: &str,
) -> Result<PreparedWrite, String> {
    if !["save", "configure", "convert"].contains(&kind) {
        return Err("Operation identity belongs to another kind".into());
    }
    let prepared: PreparedWrite =
        serde_json::from_str(payload).map_err(|error| error.to_string())?;
    prepared.validate()?;
    if (kind == "configure") != prepared.configuration.is_some()
        || (kind == "convert") != prepared.conversion.is_some()
    {
        return Err("Note operation kind mismatch".into());
    }
    if prepared.operation_id != id || owner != Some(prepared.page_id.as_str()) {
        return Err("Note operation owner mismatch".into());
    }
    let phase: NoteOperationPhase = serde_json::from_value(serde_json::Value::String(phase.into()))
        .map_err(|error| error.to_string())?;
    if (phase == NoteOperationPhase::Applied) != prepared.outcome.is_some()
        || (phase != NoteOperationPhase::Applied && prepared.after_source.is_none())
    {
        return Err("Incomplete note operation checkpoint".into());
    }
    Ok(prepared)
}
