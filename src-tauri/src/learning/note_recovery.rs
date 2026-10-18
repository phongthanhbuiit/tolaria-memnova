use super::{
    note_recovery_models::{CurrentSource, NoteResolution},
    note_write::{NoteWriteOutcome, NoteWriteStatus},
    NoteOperationPhase, NoteRecoveryRequest, NoteRecoverySummary, NoteRecoveryView, Store,
};
use rusqlite::{Connection, OptionalExtension, TransactionBehavior};
use std::path::Path;

fn current_source(
    connection: &Connection,
    root: &Path,
    page_id: &str,
) -> Result<CurrentSource, String> {
    let path: Option<String> = connection
        .query_row(
            "SELECT path FROM pages WHERE id=?1 AND deleted_at IS NULL",
            [page_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let Some(path) = path else {
        return Ok(CurrentSource::default());
    };
    super::note_write_models::validate_historical_path(&path)?;
    if !root
        .join(&path)
        .try_exists()
        .map_err(|error| error.to_string())?
    {
        return Ok(CurrentSource {
            path: Some(path),
            ..CurrentSource::default()
        });
    }
    let source = std::fs::read_to_string(super::store::checked_page_path(root, &path)?)
        .map_err(|error| error.to_string())?;
    let hash = super::migration_plan::content_hash(&source);
    Ok(CurrentSource {
        path: Some(path),
        source: Some(source),
        hash: Some(hash),
    })
}
fn phase(connection: &Connection, id: &str) -> Result<NoteOperationPhase, String> {
    let phase: String = connection
        .query_row(
            "SELECT phase FROM note_learning_operations WHERE id=?1",
            [id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    serde_json::from_value(serde_json::Value::String(phase)).map_err(|error| error.to_string())
}
fn list(
    connection: &Connection,
    include_resolved: bool,
) -> Result<Vec<NoteRecoverySummary>, String> {
    let mut query=connection.prepare("SELECT id,page_id,kind,phase,created_at FROM note_learning_operations WHERE phase!='applied' OR (?1 AND json_extract(payload_json,'$.resolution') IS NOT NULL) ORDER BY created_at,id").map_err(|error|error.to_string())?;
    let rows = query
        .query_map([include_resolved], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get(4)?,
            ))
        })
        .map_err(|error| error.to_string())?;
    rows.map(|row| {
        let (id, page_id, kind, phase, created_at) = row.map_err(|error| error.to_string())?;
        Ok(NoteRecoverySummary {
            operation_id: id,
            page_id,
            kind: serde_json::from_value(serde_json::Value::String(kind))
                .map_err(|error| error.to_string())?,
            phase: serde_json::from_value(serde_json::Value::String(phase))
                .map_err(|error| error.to_string())?,
            created_at,
        })
    })
    .collect()
}
impl Store {
    pub fn list_note_recovery(&self) -> Result<Vec<NoteRecoverySummary>, String> {
        list(&self.conn, false)
    }
    pub fn list_note_recovery_history(&self) -> Result<Vec<NoteRecoverySummary>, String> {
        list(&self.conn, true)
    }
    pub fn read_note_recovery(&self, id: &str) -> Result<NoteRecoveryView, String> {
        let prepared = self.load_note_write(id)?.ok_or("missing-note-operation")?;
        let (current, error) = match current_source(&self.conn, &self.root, &prepared.page_id) {
            Ok(source) => (source, None),
            Err(error) => (CurrentSource::default(), Some(error)),
        };
        Ok(NoteRecoveryView {
            operation_id: id.into(),
            page_id: prepared.page_id,
            phase: phase(&self.conn, id)?,
            draft_source: prepared.after_source,
            before_source: prepared
                .conversion
                .as_ref()
                .map(|intent| intent.before_source.clone()),
            current_path: current.path,
            current_source: current.source,
            current_hash: current.hash,
            source_error: error,
            kept_source: prepared
                .resolution
                .as_ref()
                .and_then(|resolution| resolution.current_source.clone()),
            outcome: prepared.outcome,
        })
    }
    pub fn resolve_note_recovery(
        &mut self,
        request: NoteRecoveryRequest,
    ) -> Result<NoteWriteOutcome, String> {
        let _operation = super::migration_import::MIGRATION_OPERATION
            .lock()
            .map_err(|error| error.to_string())?;
        let mut prepared = self
            .load_note_write(&request.operation_id)?
            .ok_or("missing-note-operation")?;
        if let Some(outcome) = &prepared.outcome {
            if prepared
                .resolution
                .as_ref()
                .is_some_and(|resolution| resolution.request == request)
            {
                return Ok(outcome.clone());
            }
            return Err("note-operation-already-finished".into());
        }
        let transaction = self
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        let outcome = resolve_in(&transaction, &self.root, &mut prepared, request)?;
        transaction.commit().map_err(|error| error.to_string())?;
        Ok(outcome)
    }
}

fn resolve_in(
    transaction: &rusqlite::Transaction<'_>,
    root: &Path,
    prepared: &mut super::note_write::PreparedWrite,
    request: NoteRecoveryRequest,
) -> Result<NoteWriteOutcome, String> {
    let current = current_source(transaction, root, &prepared.page_id)?;
    if current.hash != request.expected_current_hash {
        return Err("recovery-source-changed".into());
    }
    let before = super::note_memory_view::memory_view(
        transaction,
        root,
        &prepared.page_id,
        Some(&prepared.operation_id),
    )?;
    let before_revision = before.binding.as_ref().map(|binding| binding.revision);
    let revision = if before.binding.is_some()
        && before.state != super::note_lifecycle::NoteLearningState::Pending
    {
        super::note_reconcile::reconcile_in(transaction, &before)?
    } else {
        before_revision
    };
    let mut outcome = prepared.outcome(
        NoteWriteStatus::Discarded,
        Some("kept-current-source".into()),
    );
    outcome.revision = revision;
    prepared.resolution = Some(NoteResolution {
        version: 1,
        request,
        current_path: current.path.clone(),
        current_source: current.source.clone(),
        current_hash: current.hash.clone(),
        before_revision,
        revision,
        resolved_at: chrono::Utc::now().timestamp_millis(),
    });
    prepared.outcome = Some(outcome.clone());
    prepared.validate()?;
    if current_source(transaction, root, &prepared.page_id)? != current {
        return Err("recovery-source-changed".into());
    }
    super::note_write_journal::write_payload(transaction, prepared, NoteOperationPhase::Applied)?;
    Ok(outcome)
}
