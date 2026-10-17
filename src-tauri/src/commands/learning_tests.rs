use super::learning::{execute, LearningRequest};

#[test]
fn learning_requests_reject_cross_library_identity_and_metadata_symlinks() {
    let first = tempfile::tempdir().unwrap();
    let second = tempfile::tempdir().unwrap();
    let path = first.path().to_string_lossy().into_owned();
    let metadata = execute(&path, None, LearningRequest::Describe).unwrap();
    let id = metadata["libraryId"].as_str().unwrap().to_string();
    assert!(execute(
        &path,
        Some(id.clone()),
        LearningRequest::ListCards {
            page_id: None,
            include_trashed: false
        }
    )
    .is_ok());
    assert!(execute(
        &path,
        None,
        LearningRequest::ListCards {
            page_id: None,
            include_trashed: false
        }
    )
    .is_err());
    assert!(execute(
        &second.path().to_string_lossy(),
        Some(id),
        LearningRequest::ListCards {
            page_id: None,
            include_trashed: false
        }
    )
    .is_err());
    assert!(serde_json::from_value::<LearningRequest>(
        serde_json::json!({"kind":"executeSql","sql":"DROP TABLE cards"})
    )
    .is_err());
}

#[test]
fn card_commands_round_trip_and_keep_stale_edits_out_of_the_database() {
    use crate::learning::{CardDraft, Store};
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("lesson.md"), "# Retained lesson").unwrap();
    let path = dir.path().to_string_lossy().into_owned();
    let mut store = Store::open(dir.path()).unwrap();
    let library_id = Some(store.library_id.clone());
    let page = uuid::Uuid::new_v4().to_string();
    store.register_page(&page, "lesson.md", "Lesson").unwrap();
    drop(store);
    let draft = CardDraft {
        front: "Question".into(),
        back: "Answer".into(),
        answer_mode: "inline".into(),
        status: "active".into(),
        position: 0,
        properties: serde_json::json!({}),
    };
    let created = execute(
        &path,
        library_id.clone(),
        LearningRequest::CreateCard {
            page_id: page.clone(),
            draft: draft.clone(),
        },
    )
    .unwrap();
    let card_id = created["id"].as_str().unwrap().to_string();
    let mut updated = draft.clone();
    updated.front = "Revised question".into();
    let saved = execute(
        &path,
        library_id.clone(),
        LearningRequest::UpdateCard {
            card_id: card_id.clone(),
            revision: 0,
            draft: updated,
        },
    )
    .unwrap();
    assert_eq!(saved["front"], "Revised question");
    assert_eq!(saved["revision"], 1);
    assert!(execute(
        &path,
        library_id.clone(),
        LearningRequest::UpdateCard {
            card_id: card_id.clone(),
            revision: 0,
            draft
        }
    )
    .is_err());
    let clone = execute(
        &path,
        library_id.clone(),
        LearningRequest::CloneCard { card_id },
    )
    .unwrap();
    assert_eq!(clone["status"], "draft");
    let cards = execute(
        &path,
        library_id,
        LearningRequest::ListCards {
            page_id: Some(page),
            include_trashed: false,
        },
    )
    .unwrap();
    assert_eq!(cards.as_array().unwrap().len(), 2);
    assert_eq!(
        std::fs::read_to_string(dir.path().join("lesson.md")).unwrap(),
        "# Retained lesson"
    );
}

#[test]
fn backup_commands_restore_only_into_a_fresh_directory_inside_the_library() {
    assert!(
        serde_json::from_value::<LearningRequest>(serde_json::json!({
            "kind": "restoreBackup", "backupId": "arbitrary", "target": "/outside-library"
        }))
        .is_err()
    );
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("lesson.md"), "# Original lesson").unwrap();
    let path = dir.path().to_string_lossy().into_owned();
    let descriptor = execute(&path, None, LearningRequest::Describe).unwrap();
    let library_id = Some(descriptor["libraryId"].as_str().unwrap().to_string());
    let backup = execute(&path, library_id.clone(), LearningRequest::CreateBackup).unwrap();
    let restored = execute(
        &path,
        library_id,
        LearningRequest::RestoreBackup {
            backup_id: backup["id"].as_str().unwrap().to_string(),
        },
    )
    .unwrap();
    let target = std::path::Path::new(restored["path"].as_str().unwrap());
    assert!(target.starts_with(dir.path().canonicalize().unwrap().join(".memnova/restores")));
    assert_eq!(
        std::fs::read_to_string(target.join("lesson.md")).unwrap(),
        "# Original lesson"
    );
    assert_eq!(
        std::fs::read_to_string(dir.path().join("lesson.md")).unwrap(),
        "# Original lesson"
    );
}

#[test]
fn migration_preview_does_not_initialize_a_library_database() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("lesson.md"), "# Original lesson\n").unwrap();
    let preview = execute(
        &dir.path().to_string_lossy(),
        None,
        LearningRequest::PreviewMigration,
    )
    .unwrap();
    assert_eq!(preview["pageCount"], 1);
    assert_eq!(preview["cardCount"], 0);
    assert!(!dir.path().join(".memnova").exists());
    assert_eq!(
        std::fs::read_to_string(dir.path().join("lesson.md")).unwrap(),
        "# Original lesson\n"
    );
}

#[test]
fn migration_commands_checkpoint_resume_and_cut_over() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(
        dir.path().join("lesson.md"),
        "# Lesson\n<!-- FLASHCARD:BACK -->\nAnswer",
    )
    .unwrap();
    let path = dir.path().to_string_lossy().into_owned();
    let description = execute(&path, None, LearningRequest::Describe).unwrap();
    let id = Some(description["libraryId"].as_str().unwrap().to_owned());
    let preview = execute(&path, None, LearningRequest::PreviewMigration).unwrap();
    let request = serde_json::from_value(serde_json::json!({"kind":"beginMigration","fingerprint":preview["fingerprint"],"profileRaw":"{\"totalXp\":10}"})).unwrap();
    assert_eq!(
        execute(&path, id.clone(), request).unwrap()["state"],
        "migrating"
    );
    let request =
        serde_json::from_value(serde_json::json!({"kind":"resumeMigration","batchSize":20}))
            .unwrap();
    assert_eq!(
        execute(&path, id.clone(), request).unwrap()["state"],
        "ready"
    );
    let request = serde_json::from_value(serde_json::json!({"kind":"migrationStatus"})).unwrap();
    assert_eq!(execute(&path, id, request).unwrap()["importedCards"], 1);
}

#[test]
fn study_commands_require_cutover_and_resume_a_durable_session() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(
        dir.path().join("lesson.md"),
        "---\n_fsrs_enabled: true\n---\nQuestion\n<!-- FLASHCARD:BACK -->\nAnswer",
    )
    .unwrap();
    let path = dir.path().to_string_lossy().into_owned();
    let describe = execute(&path, None, LearningRequest::Describe).unwrap();
    let library = Some(describe["libraryId"].as_str().unwrap().to_owned());
    let request = || {
        serde_json::from_value(serde_json::json!({"kind":"startSession","scope":{"pageIds":null}}))
            .unwrap()
    };
    assert!(execute(&path, library.clone(), request()).is_err());
    let preview = execute(&path, None, LearningRequest::PreviewMigration).unwrap();
    execute(
        &path,
        library.clone(),
        LearningRequest::BeginMigration {
            fingerprint: preview["fingerprint"].as_str().unwrap().into(),
            profile_raw: None,
        },
    )
    .unwrap();
    execute(
        &path,
        library.clone(),
        LearningRequest::ResumeMigration { batch_size: 20 },
    )
    .unwrap();
    let started = execute(&path, library.clone(), request()).unwrap();
    assert_eq!(started["initialCount"], 1);
    assert_eq!(started["current"]["card"]["front"], "Question");
    let paused=serde_json::from_value(serde_json::json!({"kind":"pauseSession","sessionId":started["id"],"revision":started["revision"]})).unwrap();
    assert_eq!(
        execute(&path, library.clone(), paused).unwrap()["status"],
        "paused"
    );
    let resumed = serde_json::from_value(
        serde_json::json!({"kind":"resumeSession","sessionId":started["id"]}),
    )
    .unwrap();
    assert_eq!(
        execute(&path, library, resumed).unwrap()["id"],
        started["id"]
    );
}
