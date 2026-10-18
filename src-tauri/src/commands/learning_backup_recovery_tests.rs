use super::learning::{execute, LearningRequest};
use crate::learning::{CardDraft, Store};
use serde_json::{json, Value};
use std::{fs, path::Path};

fn call(root: &Path, library: Option<String>, request: Value) -> Result<Value, String> {
    execute(
        &root.to_string_lossy(),
        library,
        serde_json::from_value::<LearningRequest>(request).map_err(|error| error.to_string())?,
    )
}

fn prepared() -> tempfile::TempDir {
    let directory = tempfile::tempdir().unwrap();
    let descriptor = call(directory.path(), None, json!({"kind":"describe"})).unwrap();
    let id = descriptor["libraryId"].as_str().unwrap().to_string();
    let preview = call(
        directory.path(),
        Some(id.clone()),
        json!({"kind":"previewMigration"}),
    )
    .unwrap();
    call(
        directory.path(),
        Some(id.clone()),
        json!({"kind":"beginMigration","fingerprint":preview["fingerprint"],"profileRaw":null}),
    )
    .unwrap();
    call(
        directory.path(),
        Some(id),
        json!({"kind":"resumeMigration","batchSize":100}),
    )
    .unwrap();
    directory
}

#[test]
fn startup_backup_recovery_never_initializes_an_unopened_library_or_publishes_a_corrupt_archive() {
    let unopened = tempfile::tempdir().unwrap();
    assert!(call(unopened.path(), None, json!({"kind":"listRecoveryBackups"})).is_err());
    assert!(!unopened.path().join(".memnova").exists());
    let directory = prepared();
    let root = directory.path();
    fs::write(root.join("lesson.md"), "Original source").unwrap();
    let store = Store::open(root).unwrap();
    let id = store.library_id.clone();
    let backup = store.create_backup().unwrap();
    drop(store);
    let database = root.join(".memnova/learning.sqlite3");
    let broken = b"The unavailable original database must be retained";
    fs::write(&database, broken).unwrap();
    let modified = fs::metadata(&database).unwrap().modified().unwrap();
    call(root, None, json!({"kind":"listRecoveryBackups"})).unwrap();
    call(
        root,
        Some(id.clone()),
        json!({"kind":"verifyRecoveryBackup","backupId":backup.id}),
    )
    .unwrap();
    fs::write(
        root.join(".memnova/backups")
            .join(&backup.id)
            .join("files/lesson.md"),
        "Archive changed after verification",
    )
    .unwrap();
    assert!(call(
        root,
        Some(id),
        json!({"kind":"restoreRecoveryBackup","backupId":backup.id})
    )
    .is_err());
    assert!(!root.join(".memnova/restores").exists());
    assert_eq!(fs::read(&database).unwrap(), broken);
    assert_eq!(
        fs::metadata(database).unwrap().modified().unwrap(),
        modified
    );
    assert_eq!(
        fs::read_to_string(root.join("lesson.md")).unwrap(),
        "Original source"
    );
}

#[test]
fn startup_backup_recovery_lists_verifies_and_restores_without_recreating_a_missing_database() {
    let directory = prepared();
    let root = directory.path();
    let page_id = uuid::Uuid::new_v4().to_string();
    let source = format!("---\r\n_memnova_page_id: {page_id}\r\n---\r\n# Bài học\r\n<!-- FLASHCARD:BACK -->\r\nMnemonic retained\r\n");
    fs::write(root.join("lesson.md"), &source).unwrap();
    let mut store = Store::open(root).unwrap();
    store.sync_pages().unwrap();
    store
        .create_card(
            &page_id,
            CardDraft {
                front: "Retained question".into(),
                back: "Retained answer".into(),
                answer_mode: "inline".into(),
                answer_page_id: None,
                status: "active".into(),
                position: 0,
                properties: json!({"custom":false}),
                property_definitions: None,
            },
        )
        .unwrap();
    let cards = serde_json::to_value(store.list_cards(None, true).unwrap()).unwrap();
    let backup = store.create_backup().unwrap();
    let library_id = store.library_id.clone();
    drop(store);
    fs::remove_file(root.join(".memnova/learning.sqlite3")).unwrap();
    assert!(Store::open(root).is_err());
    let archive = root.join(".memnova/backups").join(&backup.id);
    let preserved = [
        root.join("lesson.md"),
        root.join(".memnova/library.json"),
        archive.join("backup.json"),
        archive.join("files/.memnova/learning.sqlite3"),
    ]
    .map(|path| {
        let bytes = fs::read(&path).unwrap();
        let modified = fs::metadata(&path).unwrap().modified().unwrap();
        (path, bytes, modified)
    });
    let catalog = call(root, None, json!({"kind":"listRecoveryBackups"})).unwrap();
    assert_eq!(catalog["libraryId"], library_id);
    assert!(catalog["backups"]
        .as_array()
        .unwrap()
        .iter()
        .any(|row| row["id"] == backup.id));
    assert!(call(
        root,
        Some(uuid::Uuid::new_v4().to_string()),
        json!({"kind":"verifyRecoveryBackup","backupId":backup.id})
    )
    .is_err());
    assert!(call(
        root,
        None,
        json!({"kind":"restoreRecoveryBackup","backupId":backup.id})
    )
    .is_err());
    call(
        root,
        Some(library_id.clone()),
        json!({"kind":"verifyRecoveryBackup","backupId":backup.id}),
    )
    .unwrap();
    let restored = call(
        root,
        Some(library_id.clone()),
        json!({"kind":"restoreRecoveryBackup","backupId":backup.id}),
    )
    .unwrap();
    let target = Path::new(restored["path"].as_str().unwrap());
    assert!(target.starts_with(root.canonicalize().unwrap().join(".memnova/restores")));
    assert_eq!(
        fs::read(target.join(".memnova/learning.sqlite3")).unwrap(),
        preserved[3].1
    );
    let restored = Store::open(target).unwrap();
    assert_eq!(restored.library_id, library_id);
    assert_eq!(
        serde_json::to_value(restored.list_cards(None, true).unwrap()).unwrap(),
        cards
    );
    assert_eq!(
        fs::read_to_string(target.join("lesson.md")).unwrap(),
        source
    );
    assert!(!root.join(".memnova/learning.sqlite3").exists());
    for (path, bytes, modified) in preserved {
        assert_eq!(fs::read(&path).unwrap(), bytes);
        assert_eq!(fs::metadata(path).unwrap().modified().unwrap(), modified);
    }
    assert!(serde_json::from_value::<LearningRequest>(
        json!({"kind":"restoreRecoveryBackup","backupId":backup.id,"target":"/outside"})
    )
    .is_err());
}
