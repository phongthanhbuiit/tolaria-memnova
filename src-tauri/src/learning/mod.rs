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
pub mod note_memory;
#[cfg(test)]
mod note_memory_codec_tests;
#[cfg(test)]
mod note_memory_fixture;
#[cfg(test)]
mod note_memory_schema_tests;
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
pub const SCHEMA_VERSION: u32 = 5;
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
    if root.join(".memnova/library.json").exists()
        && !root.join(".memnova/learning.sqlite3").exists()
    {
        return Err(
            "Learning database is missing; restore a verified backup before writing schedules"
                .into(),
        );
    }
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

#[cfg(test)]
mod source_lifecycle_tests;

#[cfg(test)]
mod property_schema_tests;

#[cfg(test)]
mod property_api_tests;

mod property_definitions;
pub use property_definitions::{PropertyDefinition, PropertyDefinitions};

mod note_storage;
mod property_precision;
pub use note_storage::{NoteBinding, NoteOperationKind, NoteOperationPhase, NoteOperationSummary};

pub mod note_write;
mod note_write_disk;
#[cfg(test)]
mod note_write_tests;

mod note_write_hooks;
mod note_write_journal;
mod note_write_models;

pub mod note_lifecycle;
#[cfg(test)]
mod note_lifecycle_tests;

mod note_configuration;
mod note_memory_view;
mod note_reconcile;
pub use note_configuration::NoteConfigureRequest;

mod note_guard;

mod note_media;
#[cfg(test)]
mod note_study_tests;
pub use note_media::NoteMediaDependency;

mod note_snapshot;
pub use note_snapshot::{NoteBackSource, NoteFacePreview, NoteStudyDetails, StudyContent};
#[cfg(test)]
mod note_media_tests;

#[cfg(test)]
mod note_backup_tests;

mod note_backup;

#[cfg(test)]
mod note_conversion_preview_tests;

mod note_conversion_cards;
mod note_conversion_models;
mod note_conversion_preview;
mod note_preview_storage;
pub use note_conversion_models::{
    NoteConversionCandidate, NoteConversionPage, NoteConversionPreview,
};
pub use note_conversion_preview::preview_note_conversion;

mod note_conversion_sources;

#[cfg(test)]
mod note_conversion_apply_tests;

mod note_conversion_apply;
mod note_conversion_intent;
mod note_conversion_source;
pub use note_conversion_intent::{
    NoteConversionDetails, NoteConversionRequest, NoteConversionResult,
};

#[cfg(test)]
mod note_conversion_test_support;
