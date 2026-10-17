use super::{CardDraft, Store};
use serde_json::json;

fn fixture() -> (tempfile::TempDir, Store) {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(
        dir.path().join("lesson.md"),
        "# Bài học\r\n\r\n**Giữ nguyên** nội dung.\r\n",
    )
    .unwrap();
    std::fs::create_dir(dir.path().join("attachments")).unwrap();
    std::fs::write(dir.path().join("attachments/audio.mp3"), [0_u8, 255, 42, 6]).unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    let id = uuid::Uuid::new_v4().to_string();
    store.register_page(&id, "lesson.md", "Bài học").unwrap();
    store
        .create_card(
            &id,
            CardDraft {
                property_definitions: None,
                answer_page_id: None,
                front: "Question".into(),
                back: "Answer".into(),
                answer_mode: "inline".into(),
                status: "active".into(),
                position: 0,
                properties: json!({"audio":"attachments/audio.mp3"}),
            },
        )
        .unwrap();
    (dir, store)
}

#[test]
fn backup_restores_live_sqlite_wal_markdown_and_binary_media_to_a_fresh_library() {
    let (dir, store) = fixture();
    let original_id = store.library_id.clone();
    let backup = store.create_backup().unwrap();
    assert_eq!(backup.library_id, original_id);
    assert_eq!(store.verify_backup(&backup.id).unwrap().id, backup.id);
    assert_eq!(
        store
            .conn
            .query_row("PRAGMA journal_mode", [], |row| row.get::<_, String>(0))
            .unwrap(),
        "wal"
    );
    assert_eq!(backup.file_count, 4);
    let parent = tempfile::tempdir().unwrap();
    let restored_path = parent.path().join("restored");
    store.restore_backup(&backup.id, &restored_path).unwrap();
    let restored = Store::open(&restored_path).unwrap();
    assert_eq!(restored.library_id, original_id);
    assert_eq!(restored.list_cards(None, true).unwrap().len(), 1);
    for relative in ["lesson.md", "attachments/audio.mp3"] {
        assert_eq!(
            std::fs::read(restored_path.join(relative)).unwrap(),
            std::fs::read(dir.path().join(relative)).unwrap()
        );
    }
    assert!(std::fs::read_dir(dir.path().join(".memnova/backups"))
        .unwrap()
        .all(|entry| entry.unwrap().file_name().to_string_lossy() == backup.id));
}

#[test]
fn corrupt_backup_is_rejected_before_restoring_and_does_not_touch_original_data() {
    let (dir, store) = fixture();
    let backup = store.create_backup().unwrap();
    std::fs::write(
        dir.path()
            .join(".memnova/backups")
            .join(&backup.id)
            .join("files/attachments/audio.mp3"),
        "damaged",
    )
    .unwrap();
    let parent = tempfile::tempdir().unwrap();
    let restored = parent.path().join("restored");
    assert!(store.restore_backup(&backup.id, &restored).is_err());
    assert!(!restored.exists());
    assert_eq!(
        std::fs::read(dir.path().join("attachments/audio.mp3")).unwrap(),
        [0_u8, 255, 42, 6]
    );
    assert_eq!(store.list_cards(None, true).unwrap().len(), 1);
}

#[test]
fn restore_never_overwrites_an_existing_directory_or_accepts_traversal() {
    let (_dir, store) = fixture();
    let backup = store.create_backup().unwrap();
    let target = tempfile::tempdir().unwrap();
    std::fs::write(target.path().join("keep.md"), "Do not replace").unwrap();
    assert!(store.restore_backup(&backup.id, target.path()).is_err());
    assert!(store
        .restore_backup("../../escape", &target.path().join("new"))
        .is_err());
    assert_eq!(
        std::fs::read_to_string(target.path().join("keep.md")).unwrap(),
        "Do not replace"
    );
}

#[test]
fn untrusted_inventory_paths_cannot_escape_the_restore_directory() {
    let (dir, store) = fixture();
    let backup = store.create_backup().unwrap();
    let manifest_path = dir
        .path()
        .join(".memnova/backups")
        .join(&backup.id)
        .join("backup.json");
    let mut manifest: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
    manifest["files"][0]["path"] = json!("../escape.md");
    std::fs::write(manifest_path, serde_json::to_vec(&manifest).unwrap()).unwrap();
    let target = tempfile::tempdir().unwrap();
    assert!(store
        .restore_backup(&backup.id, &target.path().join("restored"))
        .is_err());
    assert_eq!(std::fs::read_dir(target.path()).unwrap().count(), 0);
}

#[cfg(unix)]
#[test]
fn backup_refuses_to_follow_attachment_symlinks_and_removes_partial_files() {
    let (dir, store) = fixture();
    let outside = tempfile::tempdir().unwrap();
    std::fs::write(outside.path().join("secret.md"), "outside library").unwrap();
    std::os::unix::fs::symlink(
        outside.path().join("secret.md"),
        dir.path().join("attachments/link.md"),
    )
    .unwrap();
    assert!(store.create_backup().is_err());
    let backups = dir.path().join(".memnova/backups");
    assert!(!backups.exists() || std::fs::read_dir(backups).unwrap().count() == 0);
}

#[test]
fn backup_preserves_empty_lesson_folders() {
    let (dir, store) = fixture();
    std::fs::create_dir_all(dir.path().join("empty/folder")).unwrap();
    let backup = store.create_backup().unwrap();
    let parent = tempfile::tempdir().unwrap();
    let target = parent.path().join("restored");
    store.restore_backup(&backup.id, &target).unwrap();
    assert!(target.join("empty/folder").is_dir());
}

#[test]
fn backup_rejects_a_replaced_library_manifest_even_when_checksums_are_updated() {
    use super::backup_files::fingerprint;
    let (dir, store) = fixture();
    let backup = store.create_backup().unwrap();
    let root = dir.path().join(".memnova/backups").join(&backup.id);
    let library = root.join("files/.memnova/library.json");
    std::fs::write(
        &library,
        serde_json::to_vec(
            &json!({"formatVersion":1,"libraryId":uuid::Uuid::new_v4().to_string()}),
        )
        .unwrap(),
    )
    .unwrap();
    let manifest_path = root.join("backup.json");
    let mut manifest: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
    for entry in manifest["files"].as_array_mut().unwrap() {
        if entry["path"] == ".memnova/library.json" {
            *entry = serde_json::to_value(fingerprint(&library, ".memnova/library.json").unwrap())
                .unwrap();
        }
    }
    std::fs::write(manifest_path, serde_json::to_vec(&manifest).unwrap()).unwrap();
    let parent = tempfile::tempdir().unwrap();
    assert!(store
        .restore_backup(&backup.id, &parent.path().join("restored"))
        .is_err());
}

#[test]
fn database_integrity_failure_removes_staging_without_erasing_source_rows() {
    let (dir, store) = fixture();
    store.conn.execute_batch("PRAGMA foreign_keys=OFF; INSERT INTO cards(id,page_id,front,back,answer_mode,status,position,properties_json,created_at,updated_at) VALUES('orphan','missing-page','Q','A','inline','draft',0,'{}',0,0); PRAGMA foreign_keys=ON;").unwrap();
    assert!(store.create_backup().is_err());
    assert_eq!(
        std::fs::read_dir(dir.path().join(".memnova/backups"))
            .unwrap()
            .count(),
        0
    );
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM cards", [], |row| row.get::<_, i64>(0))
            .unwrap(),
        2
    );
}

#[test]
fn copying_rejects_bytes_that_differ_from_the_captured_snapshot() {
    use super::backup_files::{copy_snapshot_file, fingerprint};
    let (dir, _store) = fixture();
    let source = dir.path().join("lesson.md");
    let expected = fingerprint(&source, "lesson.md").unwrap();
    std::fs::write(&source, "# Changed after snapshot capture").unwrap();
    let target = tempfile::tempdir().unwrap();
    assert!(copy_snapshot_file(dir.path(), target.path(), &expected).is_err());
    assert_eq!(
        std::fs::read_to_string(&source).unwrap(),
        "# Changed after snapshot capture"
    );
}

#[test]
fn pre_migration_backup_keeps_raw_legacy_profile_and_review_log_for_recovery() {
    use super::backup::RecoverySnapshot;
    let (_dir, store) = fixture();
    let profile = br#"{ "totalXp": 1234, "dailyGoal": 45, "custom": "preserved" }"#.to_vec();
    let reviews = b"{\"rating\":3,\"note_path\":\"lesson.md\"}\r\n".to_vec();
    let backup = store
        .create_backup_with_recovery(&RecoverySnapshot {
            profile: Some(profile.clone()),
            reviews: Some(reviews.clone()),
            ..Default::default()
        })
        .unwrap();
    let parent = tempfile::tempdir().unwrap();
    let target = parent.path().join("restored");
    store.restore_backup(&backup.id, &target).unwrap();
    assert_eq!(
        std::fs::read(target.join(".memnova/legacy-profile.json")).unwrap(),
        profile
    );
    assert_eq!(
        std::fs::read(target.join(".memnova/legacy-review-log.jsonl")).unwrap(),
        reviews
    );
    assert_eq!(
        Store::open(&target)
            .unwrap()
            .list_cards(None, true)
            .unwrap()
            .len(),
        1
    );
}

#[test]
fn backup_catalog_survives_reopen_and_isolates_bad_manifests() {
    let (dir, store) = fixture();
    assert!(store.list_backups().unwrap().is_empty());
    let good = store.create_backup().unwrap();
    let bad = uuid::Uuid::new_v4().to_string();
    let directory = dir.path().join(".memnova/backups").join(&bad);
    std::fs::create_dir_all(&directory).unwrap();
    std::fs::write(directory.join("backup.json"), "broken").unwrap();
    std::fs::create_dir_all(dir.path().join(".memnova/backups/.backup-incomplete")).unwrap();
    drop(store);
    let store = Store::open(dir.path()).unwrap();
    let catalog = store.list_backups().unwrap();
    assert_eq!(catalog.len(), 2);
    assert!(catalog
        .iter()
        .find(|entry| entry.id == good.id)
        .unwrap()
        .descriptor
        .is_some());
    assert!(catalog
        .iter()
        .find(|entry| entry.id == bad)
        .unwrap()
        .error
        .is_some());
    assert_eq!(store.verify_backup(&good.id).unwrap().id, good.id);
    assert!(store.verify_backup(&bad).is_err());
    assert!(store.verify_backup("../lesson.md").is_err());
    std::fs::write(
        dir.path()
            .join(".memnova/backups")
            .join(&good.id)
            .join("files/lesson.md"),
        "corrupt",
    )
    .unwrap();
    assert!(store
        .list_backups()
        .unwrap()
        .iter()
        .any(|entry| entry.id == good.id && entry.descriptor.is_some()));
    assert!(store.verify_backup(&good.id).is_err());
}

#[cfg(unix)]
#[test]
fn backup_catalog_does_not_follow_symlink_entries() {
    let (dir, store) = fixture();
    let good = store.create_backup().unwrap();
    let alias = uuid::Uuid::new_v4().to_string();
    std::os::unix::fs::symlink(
        dir.path().join(".memnova/backups").join(good.id),
        dir.path().join(".memnova/backups").join(&alias),
    )
    .unwrap();
    assert!(store
        .list_backups()
        .unwrap()
        .iter()
        .find(|entry| entry.id == alias)
        .unwrap()
        .error
        .is_some());
}

#[test]
fn backup_catalog_isolates_timestamps_that_cannot_be_rendered_without_losing_good_backups() {
    let (dir, store) = fixture();
    let good = store.create_backup().unwrap();
    let bad = store.create_backup().unwrap();
    let manifest = dir
        .path()
        .join(".memnova/backups")
        .join(&bad.id)
        .join("backup.json");
    let mut value: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&manifest).unwrap()).unwrap();
    value["createdAt"] = serde_json::json!(i64::MAX);
    std::fs::write(manifest, serde_json::to_vec(&value).unwrap()).unwrap();
    let catalog = store.list_backups().unwrap();
    assert!(catalog
        .iter()
        .any(|entry| entry.id == good.id && entry.descriptor.is_some() && entry.error.is_none()));
    assert!(catalog
        .iter()
        .any(|entry| entry.id == bad.id && entry.descriptor.is_none() && entry.error.is_some()));
    assert!(store.verify_backup(&good.id).is_ok());
    assert!(store.verify_backup(&bad.id).is_err());
    let target = dir.path().join("invalid-restore");
    assert!(store.restore_backup(&bad.id, &target).is_err());
    assert!(!target.exists());
}
