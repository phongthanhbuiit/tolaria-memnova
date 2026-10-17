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
