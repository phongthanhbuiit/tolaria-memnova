use super::vault::VaultBoundary;
use crate::learning::{CardDraft, Store};
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Debug, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum LearningRequest {
    Describe,
    PreviewMigration,
    BeginMigration {
        fingerprint: String,
        profile_raw: Option<String>,
    },
    ResumeMigration {
        batch_size: usize,
    },
    MigrationStatus,
    ListCards {
        page_id: Option<String>,
        include_trashed: bool,
    },
    CreateCard {
        page_id: String,
        draft: CardDraft,
    },
    UpdateCard {
        card_id: String,
        revision: u32,
        draft: CardDraft,
    },
    CloneCard {
        card_id: String,
    },
    CreateBackup,
    RestoreBackup {
        backup_id: String,
    },
}

#[cfg(test)]
pub(super) fn execute(
    vault_path: &str,
    library_id: Option<String>,
    request: LearningRequest,
) -> Result<Value, String> {
    execute_with_log(vault_path, library_id, request, None)
}

fn execute_with_log(
    vault_path: &str,
    library_id: Option<String>,
    request: LearningRequest,
    legacy_log: Option<&std::path::Path>,
) -> Result<Value, String> {
    let boundary = VaultBoundary::from_request(Some(vault_path))?;
    if matches!(request, LearningRequest::PreviewMigration) {
        return serde_json::to_value(crate::learning::preview_migration(
            boundary.requested_root(),
            legacy_log,
        )?)
        .map_err(|error| error.to_string());
    }
    boundary.child_path(".memnova")?;
    let mut store = Store::open(boundary.requested_root())?;
    if !matches!(request, LearningRequest::Describe)
        && library_id.as_deref() != Some(&store.library_id)
    {
        return Err("Library identity changed; reload before continuing".into());
    }
    dispatch(&mut store, request, legacy_log)
}

fn encode(value: impl serde::Serialize) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|error| error.to_string())
}

fn dispatch(
    store: &mut Store,
    request: LearningRequest,
    legacy_log: Option<&std::path::Path>,
) -> Result<Value, String> {
    match request {
        LearningRequest::PreviewMigration => {
            Err("Migration preview must run before storage initialization".into())
        }
        LearningRequest::Describe => Ok(
            json!({"libraryId":store.library_id,"schemaVersion":crate::learning::SCHEMA_VERSION,"migrationState":store.migration_state()?}),
        ),
        LearningRequest::BeginMigration {
            fingerprint,
            profile_raw,
        } => encode(store.prepare_migration(&fingerprint, profile_raw, legacy_log)?),
        LearningRequest::ResumeMigration { batch_size } => {
            encode(store.resume_migration(batch_size)?)
        }
        LearningRequest::MigrationStatus => encode(store.migration_progress()?),
        LearningRequest::ListCards {
            page_id,
            include_trashed,
        } => encode(store.list_cards(page_id.as_deref(), include_trashed)?),
        LearningRequest::CreateCard { page_id, draft } => {
            encode(store.create_card(&page_id, draft)?)
        }
        LearningRequest::UpdateCard {
            card_id,
            revision,
            draft,
        } => encode(store.update_card(&card_id, revision, draft)?),
        LearningRequest::CloneCard { card_id } => encode(store.clone_card(&card_id)?),
        LearningRequest::CreateBackup => encode(store.create_backup()?),
        LearningRequest::RestoreBackup { backup_id } => {
            Ok(json!({"path":store.restore_local_backup(&backup_id)?}))
        }
    }
}

#[tauri::command]
pub async fn learning_command(
    app: tauri::AppHandle,
    vault_path: String,
    library_id: Option<String>,
    request: LearningRequest,
) -> Result<Value, String> {
    let legacy_log = super::fsrs_log::resolve_log_path(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        execute_with_log(&vault_path, library_id, request, Some(&legacy_log))
    })
    .await
    .map_err(|e| e.to_string())?
}
