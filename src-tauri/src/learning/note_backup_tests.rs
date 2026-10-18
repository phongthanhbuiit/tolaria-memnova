use super::{
    migration_plan::content_hash,
    note_memory::{patch_config, patch_face, MemoryConfig, MemoryFace},
    note_memory_fixture::{fixture, id, remove_note_schema},
    note_write::{NoteWriteRequest, NoteWriteStatus},
    Store,
};
use serde_json::{json, Value};
use std::fs;

fn memory_fixture() -> (tempfile::TempDir, Store) {
    let (directory, mut store) = fixture();
    fs::create_dir(directory.path().join("attachments")).unwrap();
    fs::write(
        directory.path().join("attachments/ảnh.png"),
        b"retained media",
    )
    .unwrap();
    let path = directory.path().join("ordinary.md");
    let source = fs::read_to_string(&path).unwrap();
    let source = patch_config(&source, &MemoryConfig::inline(true)).unwrap();
    let source = patch_face(&source, MemoryFace::Back, "![hint](attachments/ảnh.png)\n```tldraw\n{\"store\":{\"shape:a\":{\"typeName\":\"shape\",\"type\":\"geo\",\"props\":{}}}}\n```\n", true).unwrap();
    fs::write(path, source).unwrap();
    store
        .conn
        .execute(
            "UPDATE library_metadata SET value_json='\"ready\"' WHERE key='migrationState'",
            [],
        )
        .unwrap();
    store.reconcile_note_memory(&id(1)).unwrap();
    (directory, store)
}
fn request(store: &Store) -> NoteWriteRequest {
    let source = fs::read_to_string(store.root.join("ordinary.md")).unwrap();
    NoteWriteRequest {
        operation_id: id(800),
        page_id: id(1),
        expected_hash: content_hash(&source),
        expected_revision: store.note_binding(&id(1)).unwrap().map(|b| b.revision),
        source: source.replace("Ordinary note", "Updated article"),
    }
}
fn rows(store: &Store) -> Value {
    use rusqlite::types::ValueRef;
    let mut result = serde_json::Map::new();
    for table in [
        "pages",
        "cards",
        "schedules",
        "reviews",
        "sessions",
        "library_metadata",
        "page_property_definitions",
        "card_property_definitions",
        "note_card_bindings",
        "note_learning_operations",
    ] {
        let mut statement = store
            .conn
            .prepare(&format!("SELECT * FROM {table} ORDER BY rowid"))
            .unwrap();
        let count = statement.column_count();
        let rows: Vec<Vec<Value>> = statement
            .query_map([], |row| {
                (0..count)
                    .map(|column| {
                        Ok(match row.get_ref(column)? {
                            ValueRef::Null => Value::Null,
                            ValueRef::Integer(v) => json!(v),
                            ValueRef::Real(v) => json!(v),
                            ValueRef::Text(v) => json!(std::str::from_utf8(v).unwrap()),
                            ValueRef::Blob(v) => json!(v),
                        })
                    })
                    .collect()
            })
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        result.insert(table.into(), json!(rows));
    }
    Value::Object(result)
}
fn assert_no_published_backup(store: &Store) {
    let directory = store.root.join(".memnova/backups");
    assert!(!directory.exists() || fs::read_dir(directory).unwrap().count() == 0);
}

#[test]
fn note_backup_restores_faces_media_binding_and_legacy_history_at_a_different_root() {
    let (directory, store) = memory_fixture();
    let expected = rows(&store);
    let preview = store.read_note_face(&id(1), MemoryFace::Back).unwrap();
    let path = directory.path().join("ordinary.md");
    let modified = fs::metadata(&path).unwrap().modified().unwrap();
    let bytes = fs::read(&path).unwrap();
    let backup = store.create_backup().unwrap();
    store.verify_backup(&backup.id).unwrap();
    let parent = tempfile::tempdir().unwrap();
    let target = parent.path().join("new-root");
    store.restore_backup(&backup.id, &target).unwrap();
    let restored = Store::open(&target).unwrap();
    assert_eq!(rows(&restored), expected);
    assert_eq!(restored.library_id, store.library_id);
    let actual = restored.read_note_face(&id(1), MemoryFace::Back).unwrap();
    assert_eq!(actual.fingerprint, preview.fingerprint);
    assert_eq!(actual.media[0].sha256, preview.media[0].sha256);
    assert_eq!(fs::read(&path).unwrap(), bytes);
    assert_eq!(fs::metadata(path).unwrap().modified().unwrap(), modified);
}

#[test]
fn pending_or_conflicting_note_writes_cannot_be_published_as_healthy_backups() {
    for conflict in [false, true] {
        let (directory, mut store) = memory_fixture();
        let request = request(&store);
        let outcome = store
            .write_note_source(request, |_, _| Err("completion interrupted".into()))
            .unwrap();
        assert_eq!(outcome.status, NoteWriteStatus::Pending);
        if conflict {
            fs::write(
                directory.path().join("ordinary.md"),
                "External content retained",
            )
            .unwrap();
            let outcome = store.resume_note_memory(&id(800)).unwrap();
            assert_eq!(outcome.status, NoteWriteStatus::Conflict);
        }
        let expected = rows(&store);
        let bytes = fs::read(directory.path().join("ordinary.md")).unwrap();
        assert!(store.create_backup().is_err());
        assert_no_published_backup(&store);
        assert_eq!(rows(&store), expected);
        assert_eq!(
            fs::read(directory.path().join("ordinary.md")).unwrap(),
            bytes
        );
    }
}

#[test]
fn backup_rejects_invalid_typed_journals_without_repairing_or_dropping_them() {
    for mutation in ["owner", "receipt", "kind", "path", "version", "unknown"] {
        let (_directory, mut store) = memory_fixture();
        let write = request(&store);
        store.save_note_memory(write).unwrap();
        let raw: String = store
            .conn
            .query_row(
                "SELECT payload_json FROM note_learning_operations WHERE id=?1",
                [id(800)],
                |row| row.get(0),
            )
            .unwrap();
        let mut payload: Value = serde_json::from_str(&raw).unwrap();
        match mutation {
            "owner" => payload["pageId"] = json!(id(2)),
            "receipt" => payload["outcome"] = Value::Null,
            "kind" => {
                store
                    .conn
                    .execute(
                        "UPDATE note_learning_operations SET kind='configure' WHERE id=?1",
                        [id(800)],
                    )
                    .unwrap();
            }
            "path" => payload["path"] = json!("../../outside.md"),
            "version" => {
                store
                    .conn
                    .execute_batch("PRAGMA ignore_check_constraints=ON")
                    .unwrap();
                payload["version"] = json!(2);
            }
            _ => payload["unknown"] = json!(true),
        }
        store
            .conn
            .execute(
                "UPDATE note_learning_operations SET payload_json=?1 WHERE id=?2",
                rusqlite::params![payload.to_string(), id(800)],
            )
            .unwrap();
        let expected = rows(&store);
        assert!(store.create_backup().is_err(), "{mutation}");
        assert_no_published_backup(&store);
        assert_eq!(rows(&store), expected);
    }
}

#[test]
fn binding_identity_and_reconciliation_receipts_are_semantically_verified() {
    for mutation in ["card", "revision", "hash", "owner"] {
        let (_directory, store) = memory_fixture();
        if mutation == "card" {
            let card = store.note_binding(&id(1)).unwrap().unwrap().card_id;
            store
                .conn
                .execute_batch("PRAGMA foreign_keys=OFF;")
                .unwrap();
            store
                .conn
                .execute("UPDATE cards SET id='not-a-uuid' WHERE id=?1", [&card])
                .unwrap();
            store
                .conn
                .execute(
                    "UPDATE schedules SET card_id='not-a-uuid' WHERE card_id=?1",
                    [&card],
                )
                .unwrap();
            store
                .conn
                .execute(
                    "UPDATE note_card_bindings SET card_id='not-a-uuid' WHERE page_id=?1",
                    [id(1)],
                )
                .unwrap();
        } else {
            let raw: String = store
                .conn
                .query_row(
                    "SELECT payload_json FROM note_learning_operations WHERE kind='reconcile'",
                    [],
                    |row| row.get(0),
                )
                .unwrap();
            let mut payload: Value = serde_json::from_str(&raw).unwrap();
            match mutation {
                "revision" => payload["revision"] = json!(5),
                "hash" => payload["sourceHash"] = json!("invalid"),
                _ => payload["pageId"] = json!(id(2)),
            }
            store
                .conn
                .execute(
                    "UPDATE note_learning_operations SET payload_json=?1",
                    [payload.to_string()],
                )
                .unwrap();
        }
        assert!(store.create_backup().is_err(), "{mutation}");
        assert_no_published_backup(&store);
    }
}

#[test]
fn applied_historical_paths_and_corrupt_markdown_remain_recoverable() {
    let (directory, mut store) = memory_fixture();
    let write = request(&store);
    store.save_note_memory(write).unwrap();
    fs::rename(
        directory.path().join("ordinary.md"),
        directory.path().join("moved.md"),
    )
    .unwrap();
    store.register_page(&id(1), "moved.md", "Moved").unwrap();
    fs::write(
        directory.path().join("moved.md"),
        "---\nUnclosed user data preserved",
    )
    .unwrap();
    let expected = rows(&store);
    let backup = store.create_backup().unwrap();
    store.verify_backup(&backup.id).unwrap();
    assert_eq!(rows(&store), expected);
    let parent = tempfile::tempdir().unwrap();
    let target = parent.path().join("restored");
    store.restore_backup(&backup.id, &target).unwrap();
    assert_eq!(
        fs::read(target.join("moved.md")).unwrap(),
        fs::read(directory.path().join("moved.md")).unwrap()
    );
}

#[test]
fn older_schema_backups_restore_without_modifying_the_archived_database() {
    for version in 1..=4 {
        let (_directory, store) = fixture();
        remove_note_schema(&store);
        if version < 4 {
            store
                .conn
                .execute_batch(
                    "DROP TABLE page_property_definitions; DROP TABLE card_property_definitions;",
                )
                .unwrap();
        }
        if version < 3 {
            store
                .conn
                .execute_batch(
                    "DROP INDEX cards_answer_page; ALTER TABLE cards DROP COLUMN answer_page_id;",
                )
                .unwrap();
        }
        if version < 2 {
            store
                .conn
                .execute_batch("DROP TABLE library_metadata;")
                .unwrap();
        }
        store
            .conn
            .pragma_update(None, "user_version", version)
            .unwrap();
        let backup = store.create_backup().unwrap();
        let source = store.root.join(format!(
            ".memnova/backups/{}/files/.memnova/learning.sqlite3",
            backup.id
        ));
        let before = fs::read(&source).unwrap();
        let parent = tempfile::tempdir().unwrap();
        let target = parent.path().join("restored");
        store.restore_backup(&backup.id, &target).unwrap();
        let reopened = Store::open(&target).unwrap();
        assert_eq!(reopened.library_id, store.library_id);
        assert_eq!(reopened.get_card(&id(101)).unwrap().schedule.reps, 7);
        assert_eq!(
            reopened.get_card(&id(101)).unwrap().properties["topics"][1],
            "tế bào"
        );
        assert_eq!(fs::read(&source).unwrap(), before);
    }
}

#[test]
fn restoring_semantically_corrupt_note_metadata_is_rejected_even_with_matching_checksums() {
    let (directory, mut store) = memory_fixture();
    let write = request(&store);
    store.save_note_memory(write).unwrap();
    let backup = store.create_backup().unwrap();
    let root = directory.path().join(".memnova/backups").join(&backup.id);
    let db_path = root.join("files/.memnova/learning.sqlite3");
    let db = rusqlite::Connection::open(&db_path).unwrap();
    db.execute("UPDATE note_learning_operations SET payload_json=json_set(payload_json,'$.pageId',?1) WHERE id=?2", rusqlite::params![id(2), id(800)]).unwrap();
    drop(db);
    let manifest_path = root.join("backup.json");
    let mut manifest: Value = serde_json::from_slice(&fs::read(&manifest_path).unwrap()).unwrap();
    for file in manifest["files"].as_array_mut().unwrap() {
        if file["path"] == ".memnova/learning.sqlite3" {
            *file = serde_json::to_value(
                super::backup_files::fingerprint(&db_path, ".memnova/learning.sqlite3").unwrap(),
            )
            .unwrap();
        }
    }
    fs::write(manifest_path, serde_json::to_vec(&manifest).unwrap()).unwrap();
    let before = rows(&store);
    assert!(store.verify_backup(&backup.id).is_err());
    let parent = tempfile::tempdir().unwrap();
    let target = parent.path().join("never-created");
    assert!(store.restore_backup(&backup.id, &target).is_err());
    assert!(!target.exists());
    assert_eq!(rows(&store), before);
}
