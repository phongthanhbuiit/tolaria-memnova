use super::{
    cards::read_card,
    note_lifecycle::{NoteLearningState, NoteMemoryView},
    note_memory_view::memory_view_with_sources,
    note_reconcile::{reconcile_in, record_reconcile},
    page_sources::SourceCatalog,
    Card, LearningPage, Store,
};
use rusqlite::TransactionBehavior;
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteLearningSummary {
    pub view: NoteMemoryView,
    pub card: Option<Card>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteWorkspaceSnapshot {
    pub pages: Vec<LearningPage>,
    pub notes: Vec<NoteLearningSummary>,
}

fn relevant(view: &NoteMemoryView) -> bool {
    view.state != NoteLearningState::Ordinary
        || view.config.is_some()
        || view.binding.is_some()
        || view.legacy_card_count > 0
}
impl Store {
    fn sync_note_view(
        &mut self,
        page_id: &str,
        sources: &SourceCatalog,
    ) -> Result<NoteMemoryView, String> {
        let before =
            memory_view_with_sources(&self.conn, &self.root, page_id, None, Some(sources))?;
        if before.state == NoteLearningState::Pending
            || before.binding.is_none() && before.config.is_none()
        {
            return Ok(before);
        }
        let transaction = self
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        let current =
            memory_view_with_sources(&transaction, &self.root, page_id, None, Some(sources))?;
        if current.state == NoteLearningState::Pending {
            return Ok(current);
        }
        let revision = reconcile_in(&transaction, &current)?;
        if let Some(expected) = &current.source_hash {
            if super::note_write_disk::current_hash(&self.root, &current.path).as_deref()
                != Ok(expected.as_str())
            {
                return Err("source-changed-during-reconcile".into());
            }
        }
        record_reconcile(&transaction, &current, revision)?;
        let updated =
            memory_view_with_sources(&transaction, &self.root, page_id, None, Some(sources))?;
        transaction.commit().map_err(|error| error.to_string())?;
        Ok(updated)
    }

    /// Explicit configuration authorizes binding; ordinary files, source content and old cards are retained.
    pub fn sync_note_workspace(&mut self) -> Result<NoteWorkspaceSnapshot, String> {
        self.require_learning_ready()?;
        let _operation = super::migration_import::MIGRATION_OPERATION
            .lock()
            .map_err(|error| error.to_string())?;
        let sources = SourceCatalog::scan(&self.root)?;
        let mut pages = self.sync_pages_from_sources(&sources.sources)?;
        let mut notes = Vec::new();
        for page in &mut pages {
            page.available = page.available && sources.matches(&page.id, &page.path);
            let view = self.sync_note_view(&page.id, &sources)?;
            if !relevant(&view) {
                continue;
            }
            let card = view
                .binding
                .as_ref()
                .map(|binding| read_card(&self.conn, &binding.card_id))
                .transpose()?;
            notes.push(NoteLearningSummary { view, card });
        }
        Ok(NoteWorkspaceSnapshot { pages, notes })
    }
}
