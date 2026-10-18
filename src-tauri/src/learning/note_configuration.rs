use super::{
    note_memory::{parse_document, patch_config, MemoryConfig},
    note_memory_view::{mnemonic_source, read_note_source},
    note_reconcile::complete_memory_source,
    note_write::{NoteWriteOutcome, NoteWriteRequest},
    Store,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NoteConfigureRequest {
    pub operation_id: String,
    pub page_id: String,
    pub expected_hash: String,
    #[serde(deserialize_with = "super::note_write_models::required_revision")]
    pub expected_revision: Option<u32>,
    pub config: MemoryConfig,
}

impl Store {
    pub fn configure_note_memory(
        &mut self,
        request: NoteConfigureRequest,
    ) -> Result<NoteWriteOutcome, String> {
        self.require_learning_ready()?;
        if !request.config.valid() {
            return Err("invalid-note-configuration".into());
        }
        if let Some(prepared) = self.load_note_write(&request.operation_id)? {
            if prepared.page_id != request.page_id
                || prepared.before_hash != request.expected_hash
                || prepared.expected_revision != request.expected_revision
                || prepared.configuration.as_ref() != Some(&request.config)
            {
                return Err("Operation identity has a different configuration intent".into());
            }
            return self.resume_note_memory(&request.operation_id);
        }
        let view = self.read_note_memory(&request.page_id)?;
        if !view.identity_valid {
            return Err("identity-conflict".into());
        }
        if view.binding.is_none() && view.legacy_card_count > 0 {
            return Err("conversion-required".into());
        }
        let (_, source) = read_note_source(&self.conn, &self.root, &request.page_id)?;
        let previous = parse_document(&source).config;
        if request.config.enabled
            || previous.as_ref().map(|config| &config.back) != Some(&request.config.back)
        {
            mnemonic_source(
                &self.conn,
                &self.root,
                &request.page_id,
                &request.config.back,
            )?;
        }
        let updated = patch_config(&source, &request.config)?;
        let write = NoteWriteRequest {
            operation_id: request.operation_id,
            page_id: request.page_id,
            expected_hash: request.expected_hash,
            expected_revision: request.expected_revision,
            source: updated,
        };
        let root = self.root.clone();
        self.write_note_configuration(write, request.config, |transaction, prepared| {
            complete_memory_source(transaction, &root, prepared)
        })
    }
}
