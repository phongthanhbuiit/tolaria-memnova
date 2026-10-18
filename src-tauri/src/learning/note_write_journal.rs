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
    let payload = serde_json::to_string(prepared).map_err(|error| error.to_string())?;
    let count = connection
        .execute(
            "UPDATE note_learning_operations SET payload_json=?1,phase=?2 WHERE id=?3",
            rusqlite::params![payload, phase.as_str(), prepared.operation_id],
        )
        .map_err(|error| error.to_string())?;
    if count != 1 {
        return Err("Note operation checkpoint disappeared".into());
    }
    Ok(())
}

impl Store {
    pub(super) fn load_note_write(&self, id: &str) -> Result<Option<PreparedWrite>, String> {
        let row: Option<(String, String, Option<String>)> = self
            .conn
            .query_row(
                "SELECT payload_json,kind,page_id FROM note_learning_operations WHERE id=?1",
                [id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()
            .map_err(|error| error.to_string())?;
        row.map(|(payload, kind, owner)| {
            if kind != "save" {
                return Err("Operation identity belongs to another kind".into());
            }
            let prepared: PreparedWrite =
                serde_json::from_str(&payload).map_err(|error| error.to_string())?;
            prepared.validate()?;
            if prepared.operation_id != id || owner.as_deref() != Some(&prepared.page_id) {
                return Err("Note operation owner mismatch".into());
            }
            let phase: String = self
                .conn
                .query_row(
                    "SELECT phase FROM note_learning_operations WHERE id=?1",
                    [id],
                    |row| row.get(0),
                )
                .map_err(|error| error.to_string())?;
            let phase: NoteOperationPhase =
                serde_json::from_value(serde_json::Value::String(phase))
                    .map_err(|error| error.to_string())?;
            if (phase == NoteOperationPhase::Applied) != prepared.outcome.is_some()
                || (phase != NoteOperationPhase::Applied && prepared.after_source.is_none())
            {
                return Err("Incomplete note operation checkpoint".into());
            }
            Ok(prepared)
        })
        .transpose()
    }

    pub(super) fn prepare_note_write(
        &self,
        request: NoteWriteRequest,
    ) -> Result<PreparedWrite, String> {
        for id in [&request.operation_id, &request.page_id] {
            uuid::Uuid::parse_str(id).map_err(|_| "Invalid note write identity")?;
        }
        if !super::note_write_disk::valid_hash(&request.expected_hash) {
            return Err("Invalid expected source fingerprint".into());
        }
        let intent_hash =
            content_hash(&serde_json::to_string(&request).map_err(|error| error.to_string())?);
        if let Some(prepared) = self.load_note_write(&request.operation_id)? {
            if prepared.intent_hash != intent_hash {
                return Err("Operation identity has a different immutable intent".into());
            }
            return Ok(prepared);
        }
        validate_source(&request.source, &request.page_id)?;
        self.check_note_revision(&request.page_id, request.expected_revision)?;
        let path = self.note_write_path(&request.page_id)?;
        let before =
            std::fs::read_to_string(self.page_path(&path)?).map_err(|error| error.to_string())?;
        if content_hash(&before) != request.expected_hash {
            return Err("Note source changed; reload before saving".into());
        }
        let document = super::note_memory::parse_document(&before);
        if document.page_id.as_deref() != Some(&request.page_id) {
            return Err("Note source identity changed".into());
        }
        let pending: bool = self.conn.query_row("SELECT EXISTS(SELECT 1 FROM note_learning_operations WHERE page_id=?1 AND phase!='applied')", [&request.page_id], |row| row.get(0)).map_err(|error| error.to_string())?;
        if pending {
            return Err("Recover the pending note operation before another write".into());
        }
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
        };
        self.conn.execute("INSERT INTO note_learning_operations(id,page_id,kind,payload_json,phase,created_at) VALUES(?1,?2,'save',?3,'prepared',?4)",rusqlite::params![prepared.operation_id,prepared.page_id,serde_json::to_string(&prepared).map_err(|error| error.to_string())?,chrono::Utc::now().timestamp_millis()]).map_err(|error| error.to_string())?;
        Ok(prepared)
    }
}
