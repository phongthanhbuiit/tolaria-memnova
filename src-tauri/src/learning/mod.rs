mod backup;
mod backup_files;
mod cards;
pub use backup::{BackupCatalogEntry, BackupDescriptor};
mod models;
pub use models::{Card, CardDraft, Schedule};
mod identity;
mod store;
pub use store::Store;

#[cfg(test)]
mod backup_tests;
#[cfg(test)]
mod card_tests;
#[cfg(test)]
mod migration_preview_tests;
#[cfg(test)]
mod store_tests;

mod legacy_markdown;
mod migration_preview;
pub use legacy_markdown::{LegacyCard, LegacyPage};
pub use migration_preview::{preview_migration, MigrationIssue, MigrationPreview};
#[cfg(test)]
mod metadata_tests;

mod storage_metadata;
pub use storage_metadata::MigrationState;
pub const SCHEMA_VERSION: u32 = 3;
#[cfg(test)]
mod migration_tests;
mod page_identity;
#[cfg(test)]
mod page_identity_tests;

mod migration_plan;
pub use migration_plan::MigrationProgress;
mod migration_import;

mod legacy_log;

/// Serialize the legacy bridge with cutover without initializing untouched libraries.
pub(crate) fn with_legacy_write<T>(
    root: &std::path::Path,
    write: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    let _operation = migration_import::MIGRATION_OPERATION
        .lock()
        .map_err(|error| error.to_string())?;
    identity::reject_symlink(&root.join(".memnova"))?;
    if root.join(".memnova/learning.sqlite3").exists()
        && Store::open(root)?.migration_state()? != MigrationState::Legacy
    {
        return Err("Learning schedules are owned by SQLite after migration starts".into());
    }
    write()
}

mod session_models;
#[cfg(test)]
mod session_tests;
pub use session_models::{
    RateRequest, RateResult, SessionScope, StudyItem, StudyPage, StudySession,
};
#[cfg(test)]
mod page_lifecycle_tests;
mod review_validation;
mod reviews;
mod sessions;
mod study_source;

mod pages;
pub use pages::LearningPage;
pub mod page_content;
mod study_stats;
pub use study_stats::StudyStats;

#[cfg(test)]
mod source_contract_tests;
