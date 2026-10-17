use super::{
    backup::RecoverySnapshot,
    legacy_markdown::LegacyCard,
    page_identity::with_page_id,
    storage_metadata::{read_metadata, write_metadata},
    MigrationPreview, MigrationState, Store,
};
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashSet, fs, path::Path};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationProgress {
    pub state: MigrationState,
    pub library_id: String,
    pub backup_id: Option<String>,
    pub total_pages: usize,
    pub imported_pages: usize,
    pub total_cards: usize,
    pub imported_cards: usize,
    pub imported_reviews: usize,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct PlannedPage {
    pub id: String,
    pub path: String,
    pub title: String,
    pub original_hash: String,
    pub updated_hash: String,
    pub original_modified_at: Option<u64>,
    pub original_created_at: Option<u64>,
    pub card_id: Option<String>,
    pub card: Option<LegacyCard>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct MigrationPlan {
    pub format_version: u32,
    pub id: String,
    pub library_id: String,
    pub backup_id: String,
    pub pages: Vec<PlannedPage>,
    pub profile_raw: Option<String>,
    pub reviews_raw: Option<String>,
    pub reviews: Vec<super::legacy_log::LegacyReview>,
}

pub(super) fn content_hash(source: &str) -> String {
    format!("{:x}", Sha256::digest(source.as_bytes()))
}

pub(super) fn page_marker(plan: &MigrationPlan, page: &PlannedPage) -> String {
    format!("importPage:{}:{}", plan.id, page.id)
}

impl Store {
    pub(super) fn load_migration_plan(&self) -> Result<MigrationPlan, String> {
        let plan: MigrationPlan =
            read_metadata(&self.conn, "migrationPlan")?.ok_or("Migration checkpoint is missing")?;
        if plan.format_version != 1 || plan.library_id != self.library_id {
            return Err("Unsupported or mismatched migration checkpoint".into());
        }
        let mut pages = HashSet::new();
        let mut cards = HashSet::new();
        let mut paths = HashSet::new();
        for page in &plan.pages {
            uuid::Uuid::parse_str(&page.id).map_err(|_| "Invalid checkpoint page identity")?;
            if !pages.insert(&page.id) {
                return Err("Duplicate checkpoint page identity".into());
            }
            if !paths.insert(&page.path) || page.card.is_some() != page.card_id.is_some() {
                return Err("Inconsistent migration checkpoint page".into());
            }
            if let Some(id) = &page.card_id {
                uuid::Uuid::parse_str(id).map_err(|_| "Invalid checkpoint card identity")?;
                if !cards.insert(id) {
                    return Err("Duplicate checkpoint card identity".into());
                }
            }
            if let Some(card) = &page.card {
                card.draft.validate()?;
                card.schedule.validate()?;
            }
        }
        Ok(plan)
    }

    pub fn migration_progress(&self) -> Result<MigrationProgress, String> {
        let state = self.migration_state()?;
        if state == MigrationState::Ready {
            return read_metadata(&self.conn, "migrationReport")?
                .ok_or_else(|| "Completed migration report is missing".into());
        }
        let mut progress = MigrationProgress {
            state,
            library_id: self.library_id.clone(),
            backup_id: None,
            total_pages: 0,
            imported_pages: 0,
            total_cards: 0,
            imported_cards: 0,
            imported_reviews: 0,
        };
        if state == MigrationState::Legacy {
            return Ok(progress);
        }
        let plan = self.load_migration_plan()?;
        progress.backup_id = Some(plan.backup_id.clone());
        progress.total_pages = plan.pages.len();
        for page in &plan.pages {
            progress.total_cards += usize::from(page.card.is_some());
            if read_metadata::<bool>(&self.conn, &page_marker(&plan, page))? == Some(true) {
                progress.imported_pages += 1;
                progress.imported_cards += usize::from(page.card.is_some());
            }
        }
        Ok(progress)
    }

    pub fn prepare_migration(
        &mut self,
        expected_fingerprint: &str,
        profile_raw: Option<String>,
        legacy_log: Option<&Path>,
    ) -> Result<MigrationProgress, String> {
        let _operation = super::migration_import::MIGRATION_OPERATION
            .lock()
            .map_err(|error| error.to_string())?;
        if self.migration_state()? != MigrationState::Legacy {
            return self.migration_progress();
        }
        let preview = super::preview_migration(&self.root, legacy_log)?;
        if preview.fingerprint != expected_fingerprint {
            return Err("Library changed since preview; inspect it again".into());
        }
        if preview.issues.iter().any(|issue| issue.severity == "error") {
            return Err("Resolve migration preview errors before importing".into());
        }
        let mut recovery = RecoverySnapshot::from_root(&self.root)?;
        if recovery.profile.is_none() {
            recovery.profile = profile_raw.map(String::into_bytes);
        }
        if recovery.reviews.is_none() {
            if let Some(path) = legacy_log {
                recovery.reviews = super::backup::read_optional_recovery(path)?;
            }
        }
        recovery.review_map = Some(super::legacy_log::capture_map(
            &self.root,
            &self.library_id,
            recovery.reviews.as_deref(),
        )?);
        let backup = self.create_backup_with_recovery(&recovery)?;
        if super::preview_migration(&self.root, legacy_log)?.fingerprint != expected_fingerprint {
            return Err("Library changed while preparing its backup; preview again".into());
        }
        let plan = self.build_migration_plan(preview, backup.id, recovery)?;
        let transaction = self.conn.transaction().map_err(|error| error.to_string())?;
        if read_metadata::<MigrationState>(&transaction, "migrationState")?
            != Some(MigrationState::Legacy)
        {
            drop(transaction);
            return self.migration_progress();
        }
        write_metadata(&transaction, "migrationPlan", &plan)?;
        write_metadata(&transaction, "migrationState", &MigrationState::Migrating)?;
        transaction.commit().map_err(|error| error.to_string())?;
        self.migration_progress()
    }

    fn plan_page(&self, page: super::LegacyPage) -> Result<PlannedPage, String> {
        let existing: Option<String> = self
            .conn
            .query_row(
                "SELECT id FROM pages WHERE path=?1 AND deleted_at IS NULL",
                [&page.path],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| error.to_string())?;
        let id = page
            .existing_id
            .or(existing)
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let path = self.page_path(&page.path)?;
        let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
        let original_modified_at = metadata.modified().ok().and_then(unix_seconds);
        let original_created_at = metadata.created().ok().and_then(unix_seconds);
        let source = fs::read_to_string(path).map_err(|error| error.to_string())?;
        if content_hash(&source) != page.fingerprint {
            return Err("Page changed while preparing migration".into());
        }
        let updated_hash = content_hash(&with_page_id(&source, &id)?);
        let card_id = page.card.as_ref().map(|_| uuid::Uuid::new_v4().to_string());
        Ok(PlannedPage {
            id,
            path: page.path,
            title: page.title,
            original_hash: page.fingerprint,
            updated_hash,
            original_modified_at,
            original_created_at,
            card_id,
            card: page.card,
        })
    }

    fn build_migration_plan(
        &self,
        preview: MigrationPreview,
        backup_id: String,
        recovery: RecoverySnapshot,
    ) -> Result<MigrationPlan, String> {
        let mut pages = Vec::new();
        for page in preview.pages {
            pages.push(self.plan_page(page)?);
        }
        let reviews_raw = decode_recovery(recovery.reviews)?;
        let reviews = recovery
            .review_map
            .as_deref()
            .map(super::legacy_log::map_reviews)
            .transpose()?
            .unwrap_or_default();
        Ok(MigrationPlan {
            format_version: 1,
            id: uuid::Uuid::new_v4().to_string(),
            library_id: self.library_id.clone(),
            backup_id,
            pages,
            profile_raw: decode_recovery(recovery.profile)?,
            reviews_raw,
            reviews,
        })
    }
}

fn unix_seconds(time: std::time::SystemTime) -> Option<u64> {
    time.duration_since(std::time::UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_secs())
}

fn decode_recovery(value: Option<Vec<u8>>) -> Result<Option<String>, String> {
    value
        .map(|bytes| {
            String::from_utf8(bytes).map_err(|_| "Legacy recovery data is not UTF-8".to_string())
        })
        .transpose()
}
