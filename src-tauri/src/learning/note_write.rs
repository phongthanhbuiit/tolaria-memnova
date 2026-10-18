//! Durable source-write primitive. Completion callbacks belong to trusted native services.
pub(super) use super::note_write_hooks::{Checkpoint, NoteWriteHooks};
pub use super::note_write_models::{
    NoteWriteOutcome, NoteWriteRequest, NoteWriteStatus, PreparedWrite,
};
use super::{note_write_journal::write_payload, NoteOperationPhase, Store};
use rusqlite::{OptionalExtension, Transaction};

fn source_matches(
    connection: &rusqlite::Connection,
    root: &std::path::Path,
    prepared: &PreparedWrite,
) -> Result<bool, String> {
    let path: Option<String> = connection
        .query_row(
            "SELECT path FROM pages WHERE id=?1 AND deleted_at IS NULL",
            [&prepared.page_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let hash = super::note_write_disk::current_hash(root, &prepared.path);
    Ok(path.as_deref() == Some(&prepared.path)
        && hash.as_deref() == Ok(prepared.after_hash.as_str()))
}

fn expected_revision_matches(
    connection: &rusqlite::Connection,
    prepared: &PreparedWrite,
) -> Result<bool, String> {
    let revision: Option<u32> = connection
        .query_row(
            "SELECT revision FROM note_card_bindings WHERE page_id=?1",
            [&prepared.page_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    Ok(revision == prepared.expected_revision)
}

impl Store {
    pub(super) fn note_write_path(&self, id: &str) -> Result<String, String> {
        self.conn
            .query_row(
                "SELECT path FROM pages WHERE id=?1 AND deleted_at IS NULL",
                [id],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())
    }

    pub(super) fn check_note_revision(
        &self,
        page: &str,
        expected: Option<u32>,
    ) -> Result<(), String> {
        if self.note_binding(page)?.map(|binding| binding.revision) != expected {
            return Err("Note learning revision changed; reload before saving".into());
        }
        Ok(())
    }

    pub fn write_note_source(
        &mut self,
        request: NoteWriteRequest,
        complete: impl FnOnce(&Transaction<'_>, &PreparedWrite) -> Result<Option<u32>, String>,
    ) -> Result<NoteWriteOutcome, String> {
        self.write_note_source_with_hooks(request, complete, &NoteWriteHooks::default())
    }

    pub(super) fn write_note_source_with_hooks(
        &mut self,
        request: NoteWriteRequest,
        complete: impl FnOnce(&Transaction<'_>, &PreparedWrite) -> Result<Option<u32>, String>,
        hooks: &NoteWriteHooks,
    ) -> Result<NoteWriteOutcome, String> {
        self.write_note_source_context(request, complete, hooks, None)
    }

    pub(super) fn write_note_configuration(
        &mut self,
        request: NoteWriteRequest,
        config: super::note_memory::MemoryConfig,
        complete: impl FnOnce(&Transaction<'_>, &PreparedWrite) -> Result<Option<u32>, String>,
    ) -> Result<NoteWriteOutcome, String> {
        self.write_note_source_context(request, complete, &NoteWriteHooks::default(), Some(config))
    }

    fn write_note_source_context(
        &mut self,
        request: NoteWriteRequest,
        complete: impl FnOnce(&Transaction<'_>, &PreparedWrite) -> Result<Option<u32>, String>,
        hooks: &NoteWriteHooks,
        configuration: Option<super::note_memory::MemoryConfig>,
    ) -> Result<NoteWriteOutcome, String> {
        let _operation = super::migration_import::MIGRATION_OPERATION
            .lock()
            .map_err(|error| error.to_string())?;
        let mut prepared = self.prepare_note_write(request, configuration)?;
        if prepared.outcome.is_none() {
            hooks.checkpoint(Checkpoint::Prepared)?;
        }
        self.finish_note_write(&mut prepared, complete, hooks)
    }

    pub fn resume_note_write(
        &mut self,
        id: &str,
        complete: impl FnOnce(&Transaction<'_>, &PreparedWrite) -> Result<Option<u32>, String>,
    ) -> Result<NoteWriteOutcome, String> {
        let _operation = super::migration_import::MIGRATION_OPERATION
            .lock()
            .map_err(|error| error.to_string())?;
        let mut prepared = self
            .load_note_write(id)?
            .ok_or("Note operation not found")?;
        self.finish_note_write(&mut prepared, complete, &NoteWriteHooks::default())
    }

    fn compact_note_write(&self, prepared: &mut PreparedWrite) -> Result<NoteWriteOutcome, String> {
        let outcome = prepared
            .outcome
            .clone()
            .ok_or("Note write receipt is missing")?;
        if prepared.after_source.take().is_some() {
            write_payload(&self.conn, prepared, NoteOperationPhase::Applied)?;
        }
        Ok(outcome)
    }

    fn ensure_note_file(
        &self,
        prepared: &PreparedWrite,
        hooks: &NoteWriteHooks,
    ) -> Result<Option<NoteWriteOutcome>, String> {
        if self.note_write_path(&prepared.page_id).ok().as_deref() != Some(&prepared.path)
            || !self.root.join(&prepared.path).exists()
        {
            return self
                .conflict_note_write(
                    prepared,
                    "Note moved or was deleted during the pending write",
                )
                .map(Some);
        }
        let current = match super::note_write_disk::current_hash(&self.root, &prepared.path) {
            Ok(hash) => hash,
            Err(error) => {
                return Ok(Some(
                    prepared.outcome(NoteWriteStatus::Pending, Some(error)),
                ))
            }
        };
        if current != prepared.before_hash && current != prepared.after_hash {
            return self
                .conflict_note_write(prepared, "Note source differs from both saved checkpoints")
                .map(Some);
        }
        if let Err(error) = self.check_note_revision(&prepared.page_id, prepared.expected_revision)
        {
            return self.conflict_note_write(prepared, &error).map(Some);
        }
        if current != prepared.after_hash {
            return self.replace_note_file(prepared, hooks);
        }
        Ok(None)
    }

    fn replace_note_file(
        &self,
        prepared: &PreparedWrite,
        hooks: &NoteWriteHooks,
    ) -> Result<Option<NoteWriteOutcome>, String> {
        if let Err(error) = super::note_write_disk::replace_source(&self.root, prepared, hooks) {
            #[cfg(test)]
            if error.starts_with("Injected interruption") {
                return Err(error);
            }
            if super::note_write_disk::current_hash(&self.root, &prepared.path)
                .is_ok_and(|hash| hash != prepared.before_hash && hash != prepared.after_hash)
            {
                return self.conflict_note_write(prepared, &error).map(Some);
            }
            return Ok(Some(
                prepared.outcome(NoteWriteStatus::Pending, Some(error)),
            ));
        }
        Ok(None)
    }

    fn commit_note_write(
        &mut self,
        prepared: &mut PreparedWrite,
        complete: impl FnOnce(&Transaction<'_>, &PreparedWrite) -> Result<Option<u32>, String>,
        hooks: &NoteWriteHooks,
    ) -> Result<NoteWriteOutcome, String> {
        let mut outcome = prepared.outcome(NoteWriteStatus::Committed, None);
        let transaction = self
            .conn
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        if !expected_revision_matches(&transaction, prepared)? {
            drop(transaction);
            return self
                .conflict_note_write(prepared, "Note binding changed before database completion");
        }
        if !source_matches(&transaction, &self.root, prepared)? {
            drop(transaction);
            return self
                .conflict_note_write(prepared, "Note source changed before database completion");
        }
        match complete(&transaction, prepared) {
            Ok(revision) => outcome.revision = revision,
            Err(error) => {
                let unchanged = source_matches(&transaction, &self.root, prepared)?;
                drop(transaction);
                if !unchanged {
                    return self.conflict_note_write(
                        prepared,
                        "Note source changed during failed completion",
                    );
                }
                return Ok(prepared.outcome(NoteWriteStatus::Pending, Some(error)));
            }
        }
        hooks.checkpoint(Checkpoint::Transaction)?;
        if !source_matches(&transaction, &self.root, prepared)? {
            drop(transaction);
            return self
                .conflict_note_write(prepared, "Note source changed before database completion");
        }
        prepared.outcome = Some(outcome.clone());
        write_payload(&transaction, prepared, NoteOperationPhase::Applied)?;
        transaction.commit().map_err(|error| error.to_string())?;
        Ok(outcome)
    }

    fn finish_note_write(
        &mut self,
        prepared: &mut PreparedWrite,
        complete: impl FnOnce(&Transaction<'_>, &PreparedWrite) -> Result<Option<u32>, String>,
        hooks: &NoteWriteHooks,
    ) -> Result<NoteWriteOutcome, String> {
        if prepared.outcome.is_some() {
            return self.compact_note_write(prepared);
        }
        if let Some(outcome) = self.ensure_note_file(prepared, hooks)? {
            return Ok(outcome);
        }
        hooks.checkpoint(Checkpoint::Renamed)?;
        write_payload(&self.conn, prepared, NoteOperationPhase::FileWritten)?;
        hooks.checkpoint(Checkpoint::FileWritten)?;
        let outcome = self.commit_note_write(prepared, complete, hooks)?;
        if outcome.status != NoteWriteStatus::Committed {
            return Ok(outcome);
        }
        hooks.checkpoint(Checkpoint::Applied)?;
        let outcome = self.compact_note_write(prepared)?;
        hooks.checkpoint(Checkpoint::Compacted)?;
        Ok(outcome)
    }

    fn conflict_note_write(
        &self,
        prepared: &PreparedWrite,
        message: &str,
    ) -> Result<NoteWriteOutcome, String> {
        write_payload(&self.conn, prepared, NoteOperationPhase::Conflict)?;
        Ok(prepared.outcome(NoteWriteStatus::Conflict, Some(message.into())))
    }
}
