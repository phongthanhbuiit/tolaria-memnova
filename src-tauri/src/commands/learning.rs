use super::vault::VaultBoundary;
use crate::learning::{CardDraft, RateRequest, SessionScope, Store};
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
    PreviewNoteSource {
        path: String,
        face: crate::learning::note_memory::MemoryFace,
    },
    ReadNoteFace {
        page_id: String,
        face: crate::learning::note_memory::MemoryFace,
    },
    ReadNoteMemory {
        page_id: String,
    },
    SaveNoteMemory {
        request: crate::learning::note_write::NoteWriteRequest,
    },
    ConfigureNoteMemory {
        request: crate::learning::NoteConfigureRequest,
    },
    ResumeNoteMemory {
        operation_id: String,
    },
    ReconcileNoteMemory {
        page_id: String,
    },
    ListNoteRecovery {
        include_resolved: bool,
    },
    ReadNoteRecovery {
        operation_id: String,
    },
    ResolveNoteRecovery {
        request: crate::learning::NoteRecoveryRequest,
    },
    ApplyNoteConversion {
        request: crate::learning::NoteConversionRequest,
    },
    ResumeNoteConversion {
        operation_id: String,
    },
    NoteConversionDetails {
        operation_id: String,
    },
    NoteCompatibility {
        page_id: String,
    },
    PreviewNoteConversion {},
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
        operation_id: Option<String>,
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
    ListPages,
    SyncPages,
    SyncNoteWorkspace {},
    EnsurePage {
        path: String,
        expected_hash: Option<String>,
    },
    ReadStudyPage {
        page_id: String,
    },
    PagePropertyDefinitions {
        page_id: String,
    },
    SetPagePropertyDefinitions {
        page_id: String,
        expected: crate::learning::PropertyDefinitions,
        definitions: crate::learning::PropertyDefinitions,
    },
    StudyStats,
    SetDailyGoal {
        goal: u64,
    },
    StartSession {
        scope: SessionScope,
    },
    GetSession {
        session_id: String,
    },
    ResumeSession {
        session_id: String,
    },
    PauseSession {
        session_id: String,
        revision: u32,
    },
    SkipSessionCard {
        session_id: String,
        revision: u32,
    },
    RateCard {
        review: RateRequest,
    },
    UndoReview {
        session_id: String,
        review_id: String,
        revision: u32,
    },
    ListBackups,
    VerifyBackup {
        backup_id: String,
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
    if let LearningRequest::PreviewNoteSource { path, face } = &request {
        return encode(crate::learning::preview_note_source(
            boundary.requested_root(),
            library_id.as_deref().ok_or("missing-library-id")?,
            path,
            *face,
        )?);
    }
    if matches!(request, LearningRequest::PreviewNoteConversion {}) {
        return encode(crate::learning::preview_note_conversion(
            boundary.requested_root(),
            library_id.as_deref(),
        )?);
    }
    if matches!(request, LearningRequest::PreviewMigration) {
        return serde_json::to_value(crate::learning::preview_migration(
            boundary.requested_root(),
            legacy_log,
        )?)
        .map_err(|error| error.to_string());
    }
    // The learning store owns and validates its reserved metadata paths.
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
        LearningRequest::PreviewNoteSource { .. } => {
            Err("Source preview must use the read-only route".into())
        }
        LearningRequest::PreviewNoteConversion {} => {
            Err("Conversion preview must use the read-only route".into())
        }
        LearningRequest::PreviewMigration => {
            Err("Migration preview must run before storage initialization".into())
        }
        note @ (LearningRequest::ReadNoteFace { .. }
        | LearningRequest::ReadNoteMemory { .. }
        | LearningRequest::SaveNoteMemory { .. }
        | LearningRequest::ConfigureNoteMemory { .. }
        | LearningRequest::ResumeNoteMemory { .. }
        | LearningRequest::ReconcileNoteMemory { .. }
        | LearningRequest::ListNoteRecovery { .. }
        | LearningRequest::ReadNoteRecovery { .. }
        | LearningRequest::ResolveNoteRecovery { .. }
        | LearningRequest::ApplyNoteConversion { .. }
        | LearningRequest::ResumeNoteConversion { .. }
        | LearningRequest::NoteConversionDetails { .. }
        | LearningRequest::NoteCompatibility { .. }) => dispatch_note_memory(store, note),
        LearningRequest::Describe => Ok(
            json!({"libraryId":store.library_id,"schemaVersion":crate::learning::SCHEMA_VERSION,"migrationState":store.migration_state()?,"capabilities":{"noteMemory":1,"noteStudy":1,"noteWorkspace":1}}),
        ),
        LearningRequest::BeginMigration {
            fingerprint,
            profile_raw,
        } => encode(store.prepare_migration(&fingerprint, profile_raw, legacy_log)?),
        LearningRequest::ResumeMigration { batch_size } => {
            encode(store.resume_migration(batch_size)?)
        }
        LearningRequest::MigrationStatus => encode(store.migration_progress()?),
        card @ (LearningRequest::ListCards { .. }
        | LearningRequest::CreateCard { .. }
        | LearningRequest::UpdateCard { .. }
        | LearningRequest::CloneCard { .. }) => dispatch_cards(store, card),
        page @ (LearningRequest::ListPages
        | LearningRequest::SyncPages
        | LearningRequest::EnsurePage { .. }
        | LearningRequest::ReadStudyPage { .. }
        | LearningRequest::PagePropertyDefinitions { .. }
        | LearningRequest::SetPagePropertyDefinitions { .. }) => dispatch_pages(store, page),
        LearningRequest::SyncNoteWorkspace {} => encode(store.sync_note_workspace()?),
        LearningRequest::StudyStats => encode(store.study_stats()?),
        LearningRequest::SetDailyGoal { goal } => encode(store.set_daily_goal(goal)?),
        study @ (LearningRequest::StartSession { .. }
        | LearningRequest::GetSession { .. }
        | LearningRequest::ResumeSession { .. }
        | LearningRequest::PauseSession { .. }
        | LearningRequest::SkipSessionCard { .. }
        | LearningRequest::RateCard { .. }
        | LearningRequest::UndoReview { .. }) => dispatch_study(store, study),
        recovery @ (LearningRequest::ListBackups
        | LearningRequest::VerifyBackup { .. }
        | LearningRequest::CreateBackup
        | LearningRequest::RestoreBackup { .. }) => dispatch_recovery(store, recovery),
    }
}

fn dispatch_note_memory(store: &mut Store, request: LearningRequest) -> Result<Value, String> {
    match request {
        LearningRequest::ListNoteRecovery { include_resolved } => encode(if include_resolved {
            store.list_note_recovery_history()?
        } else {
            store.list_note_recovery()?
        }),
        LearningRequest::ReadNoteRecovery { operation_id } => {
            encode(store.read_note_recovery(&operation_id)?)
        }
        LearningRequest::ResolveNoteRecovery { request } => {
            encode(store.resolve_note_recovery(request)?)
        }
        LearningRequest::ApplyNoteConversion { request } => {
            encode(store.apply_note_conversion(request)?)
        }
        LearningRequest::ResumeNoteConversion { operation_id } => {
            encode(store.resume_note_conversion(&operation_id)?)
        }
        LearningRequest::NoteConversionDetails { operation_id } => {
            encode(store.note_conversion_details(&operation_id)?)
        }
        LearningRequest::NoteCompatibility { page_id } => {
            encode(store.note_compatibility(&page_id)?)
        }
        LearningRequest::ReadNoteFace { page_id, face } => {
            encode(store.read_note_face(&page_id, face)?)
        }
        LearningRequest::ReadNoteMemory { page_id } => encode(store.read_note_memory(&page_id)?),
        LearningRequest::SaveNoteMemory { request } => encode(store.save_note_memory(request)?),
        LearningRequest::ConfigureNoteMemory { request } => {
            encode(store.configure_note_memory(request)?)
        }
        LearningRequest::ResumeNoteMemory { operation_id } => {
            encode(store.resume_note_memory(&operation_id)?)
        }
        LearningRequest::ReconcileNoteMemory { page_id } => {
            encode(store.reconcile_note_memory(&page_id)?)
        }
        _ => Err("Invalid note_memory command routing".into()),
    }
}

fn dispatch_cards(store: &mut Store, request: LearningRequest) -> Result<Value, String> {
    match request {
        LearningRequest::ListCards {
            page_id,
            include_trashed,
        } => encode(store.list_legacy_cards(page_id.as_deref(), include_trashed)?),
        LearningRequest::CreateCard {
            page_id,
            draft,
            operation_id,
        } => encode(match operation_id {
            Some(id) => store.create_card_once(&id, &page_id, draft)?,
            None => store.create_card(&page_id, draft)?,
        }),
        LearningRequest::UpdateCard {
            card_id,
            revision,
            draft,
        } => encode(store.update_card(&card_id, revision, draft)?),
        LearningRequest::CloneCard { card_id } => encode(store.clone_card(&card_id)?),
        _ => Err("Invalid cards command routing".into()),
    }
}

fn dispatch_recovery(store: &mut Store, request: LearningRequest) -> Result<Value, String> {
    match request {
        LearningRequest::ListBackups => encode(store.list_backups()?),
        LearningRequest::VerifyBackup { backup_id } => encode(store.verify_backup(&backup_id)?),
        LearningRequest::CreateBackup => encode(store.create_backup()?),
        LearningRequest::RestoreBackup { backup_id } => {
            Ok(json!({"path":store.restore_local_backup(&backup_id)?}))
        }
        _ => Err("Invalid recovery command routing".into()),
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

fn dispatch_pages(store: &mut Store, request: LearningRequest) -> Result<Value, String> {
    match request {
        LearningRequest::ListPages => encode(store.list_pages()?),
        LearningRequest::SyncPages => encode(store.sync_pages()?),
        LearningRequest::EnsurePage {
            path,
            expected_hash,
        } => encode(match expected_hash {
            Some(expected) => store.ensure_page_with_hash(&path, Some(&expected))?,
            None => store.ensure_page(&path)?,
        }),
        LearningRequest::ReadStudyPage { page_id } => encode(store.read_study_page(&page_id)?),
        LearningRequest::PagePropertyDefinitions { page_id } => {
            encode(store.page_property_definitions(&page_id)?)
        }
        LearningRequest::SetPagePropertyDefinitions {
            page_id,
            expected,
            definitions,
        } => encode(store.set_page_property_definitions(&page_id, &expected, &definitions)?),
        _ => Err("Invalid page command routing".into()),
    }
}
fn dispatch_study(store: &mut Store, request: LearningRequest) -> Result<Value, String> {
    match request {
        LearningRequest::StartSession { scope } => encode(store.start_session(scope)?),
        LearningRequest::GetSession { session_id } => encode(store.get_session(&session_id)?),
        LearningRequest::ResumeSession { session_id } => encode(store.resume_session(&session_id)?),
        LearningRequest::PauseSession {
            session_id,
            revision,
        } => encode(store.pause_session(&session_id, revision)?),
        LearningRequest::SkipSessionCard {
            session_id,
            revision,
        } => encode(store.skip_session_card(&session_id, revision)?),
        LearningRequest::RateCard { review } => encode(store.rate_card(review)?),
        LearningRequest::UndoReview {
            session_id,
            review_id,
            revision,
        } => encode(store.undo_review(&session_id, &review_id, revision)?),
        _ => Err("Invalid study command routing".into()),
    }
}
