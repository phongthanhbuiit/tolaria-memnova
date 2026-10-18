use super::{
    note_memory_fixture::{fixture, id, remove_note_schema},
    Store,
};
use serde_json::Value;
use std::{fs, path::Path};

fn manifest(root: &Path) -> Vec<(String, Vec<u8>, std::time::SystemTime)> {
    let mut result = Vec::new();
    for entry in walkdir::WalkDir::new(root) {
        let entry = entry.unwrap();
        if entry.file_type().is_file() {
            result.push((
                entry
                    .path()
                    .strip_prefix(root)
                    .unwrap()
                    .to_string_lossy()
                    .into_owned(),
                fs::read(entry.path()).unwrap(),
                fs::metadata(entry.path()).unwrap().modified().unwrap(),
            ));
        }
    }
    result.sort_by(|left, right| left.0.cmp(&right.0));
    result
}
fn preview(root: &Path) -> Value {
    serde_json::to_value(super::preview_note_conversion(root, None).unwrap()).unwrap()
}
fn ready(store: &Store) {
    store
        .conn
        .execute(
            "UPDATE library_metadata SET value_json='\"ready\"' WHERE key='migrationState'",
            [],
        )
        .unwrap();
}
fn page<'a>(preview: &'a Value, path: &str) -> &'a Value {
    preview["pages"]
        .as_array()
        .unwrap()
        .iter()
        .find(|p| p["path"] == path)
        .unwrap()
}

#[test]
fn unopened_preview_preserves_bytes_mtimes_and_never_creates_a_library_identity() {
    let directory = tempfile::tempdir().unwrap();
    fs::write(directory.path().join("ordinary.md"), "# Article\n").unwrap();
    fs::write(directory.path().join("old.md"), "---\n_fsrs_enabled: true\nopaque: &data {value: 9007199254740993}\ncopy: *data\n---\nOriginal\n<!-- FLASHCARD:BACK -->\nMnemonic\n").unwrap();
    let before = manifest(directory.path());
    let result = preview(directory.path());
    assert_eq!(result["state"], "importRequired");
    assert!(result["libraryId"].is_null());
    assert_eq!(page(&result, "ordinary.md")["classification"], "ordinary");
    assert_eq!(page(&result, "old.md")["classification"], "legacyMarkdown");
    assert!(page(&result, "old.md")["pageId"].is_null());
    assert!(page(&result, "old.md")["propertiesRaw"]
        .as_str()
        .unwrap()
        .contains("copy: *data"));
    assert_eq!(manifest(directory.path()), before);
    assert!(!directory.path().join(".memnova").exists());
}

#[test]
fn ready_preview_keeps_conflicts_multiple_candidates_and_opaque_metadata_without_writes() {
    let (directory, store) = fixture();
    ready(&store);
    let raw = "{ \"opaque\": [9007199254740993,null], \"image\": \"attachments/old.png\" }";
    store
        .conn
        .execute(
            "UPDATE cards SET properties_json=?1 WHERE id=?2",
            rusqlite::params![raw, id(101)],
        )
        .unwrap();
    store.conn.execute("INSERT INTO card_property_definitions(card_id,key,value_kind,item_kind) VALUES(?1,'opaque','list','text')", [id(101)]).unwrap();
    let before = manifest(directory.path());
    let result = preview(directory.path());
    assert_eq!(result["state"], "ready");
    let lesson = page(&result, "lesson.md");
    assert_eq!(lesson["classification"], "conflict");
    assert_eq!(lesson["candidates"][0]["card"]["id"], id(101));
    assert_eq!(lesson["candidates"][0]["propertiesRaw"], raw);
    assert_eq!(lesson["candidates"][0]["card"]["schedule"]["reps"], 7);
    assert_eq!(lesson["candidates"][0]["reviewCount"], 2);
    assert_eq!(lesson["candidates"][0]["undoneReviewCount"], 1);
    assert_eq!(
        lesson["candidates"][0]["card"]["propertyDefinitions"]["opaque"]["valueKind"],
        "list"
    );
    assert!(lesson["suggestedReuseCardId"].is_null());
    assert_eq!(page(&result, "multi.md")["classification"], "multiple");
    assert_eq!(
        page(&result, "multi.md")["candidates"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert_eq!(manifest(directory.path()), before);
    assert_eq!(result, preview(directory.path()));
}

#[test]
fn exact_faces_only_suggest_reuse_and_whole_page_answers_require_explicit_meaning() {
    let (directory, store) = fixture();
    ready(&store);
    let raw = fs::read_to_string(directory.path().join("lesson.md")).unwrap();
    let document = super::note_memory::parse_document(&raw);
    store
        .conn
        .execute(
            "UPDATE cards SET front=?1,back=?2 WHERE id=?3",
            rusqlite::params![document.front, document.back, id(101)],
        )
        .unwrap();
    let equal = preview(directory.path());
    assert_eq!(page(&equal, "lesson.md")["classification"], "matching");
    assert_eq!(page(&equal, "lesson.md")["suggestedReuseCardId"], id(101));
    assert!(page(&equal, "lesson.md").get("selection").is_none());
    store
        .conn
        .execute(
            "UPDATE cards SET answer_mode='page',answer_page_id=?1 WHERE id=?2",
            rusqlite::params![id(4), id(101)],
        )
        .unwrap();
    let whole = preview(directory.path());
    assert_eq!(page(&whole, "lesson.md")["classification"], "wholePage");
    assert!(page(&whole, "lesson.md")["suggestedReuseCardId"].is_null());
    assert_ne!(equal["fingerprint"], whole["fingerprint"]);
}

#[test]
fn invalid_missing_duplicate_and_trashed_sources_are_reported_without_dropping_legacy_cards() {
    let (directory, store) = fixture();
    ready(&store);
    store
        .conn
        .execute("UPDATE cards SET status='trashed' WHERE id=?1", [id(101)])
        .unwrap();
    assert_eq!(
        page(&preview(directory.path()), "lesson.md")["classification"],
        "trashed"
    );
    fs::remove_file(directory.path().join("lesson.md")).unwrap();
    let missing = preview(directory.path());
    assert_eq!(page(&missing, "lesson.md")["classification"], "invalid");
    assert_eq!(
        page(&missing, "lesson.md")["candidates"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    fs::copy(
        directory.path().join("multi.md"),
        directory.path().join("copy.md"),
    )
    .unwrap();
    fs::write(directory.path().join("nguồn.md"), "---\nunterminated data").unwrap();
    let before = manifest(directory.path());
    let invalid = preview(directory.path());
    assert_eq!(page(&invalid, "multi.md")["classification"], "invalid");
    assert_eq!(page(&invalid, "copy.md")["classification"], "invalid");
    assert_eq!(page(&invalid, "nguồn.md")["classification"], "invalid");
    assert_eq!(manifest(directory.path()), before);
}

#[test]
fn source_card_schedule_and_property_changes_invalidate_the_conversion_preview() {
    let (directory, store) = fixture();
    ready(&store);
    let mut previous = preview(directory.path());
    for sql in [
        "UPDATE cards SET back='Changed answer'",
        "UPDATE schedules SET stability=stability+1",
        "UPDATE cards SET properties_json='{\"unknown\":true}'",
    ] {
        store.conn.execute(sql, []).unwrap();
        let current = preview(directory.path());
        assert_ne!(current["fingerprint"], previous["fingerprint"]);
        previous = current;
    }
    let path = directory.path().join("lesson.md");
    fs::write(
        &path,
        fs::read_to_string(&path)
            .unwrap()
            .replace("Markdown original", "New article"),
    )
    .unwrap();
    assert_ne!(
        preview(directory.path())["fingerprint"],
        previous["fingerprint"]
    );
}

#[test]
fn old_schema_and_missing_database_preview_do_not_initialize_or_upgrade_storage() {
    let (directory, store) = fixture();
    remove_note_schema(&store);
    store.conn.pragma_update(None, "user_version", 4).unwrap();
    let before = manifest(directory.path());
    let result = preview(directory.path());
    assert_eq!(result["state"], "upgradeRequired");
    assert_eq!(manifest(directory.path()), before);
    drop(store);
    fs::remove_file(directory.path().join(".memnova/learning.sqlite3")).unwrap();
    let before = manifest(directory.path());
    assert_eq!(preview(directory.path())["state"], "recoveryRequired");
    assert_eq!(manifest(directory.path()), before);
}

#[test]
fn preview_reads_committed_wal_data_and_rejects_another_library_identity() {
    let (directory, store) = fixture();
    ready(&store);
    store
        .conn
        .execute(
            "UPDATE cards SET back='Latest committed WAL answer' WHERE id=?1",
            [id(101)],
        )
        .unwrap();
    let before = manifest(directory.path());
    assert_eq!(
        page(&preview(directory.path()), "lesson.md")["candidates"][0]["card"]["back"],
        "Latest committed WAL answer"
    );
    assert_eq!(manifest(directory.path()), before);
    assert!(super::preview_note_conversion(directory.path(), Some(&id(999))).is_err());
    assert_eq!(manifest(directory.path()), before);
}

#[test]
fn preview_does_not_create_wal_or_shared_memory_files_in_a_closed_library() {
    let (directory, store) = fixture();
    ready(&store);
    store
        .conn
        .query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| {
            row.get::<_, i32>(0)
        })
        .unwrap();
    drop(store);
    for suffix in ["-wal", "-shm"] {
        let path = directory
            .path()
            .join(format!(".memnova/learning.sqlite3{suffix}"));
        if path.exists() {
            fs::remove_file(path).unwrap();
        }
    }
    let before = manifest(directory.path());
    assert_eq!(preview(directory.path())["state"], "ready");
    assert_eq!(manifest(directory.path()), before);
}

#[test]
fn bound_candidates_are_separate_and_pending_recovery_remains_visible() {
    let (directory, mut store) = fixture();
    ready(&store);
    let path = directory.path().join("multi.md");
    let source = fs::read_to_string(&path).unwrap();
    store.conn.execute("INSERT INTO note_card_bindings(page_id,card_id,source_hash,revision) VALUES(?1,?2,?3,0)", rusqlite::params![id(3),id(102),super::migration_plan::content_hash(&source)]).unwrap();
    let bound = preview(directory.path());
    let row = page(&bound, "multi.md");
    assert_eq!(row["classification"], "bound");
    assert_eq!(row["candidates"].as_array().unwrap().len(), 1);
    assert_eq!(row["candidates"][0]["card"]["id"], id(103));
    let request = super::note_write::NoteWriteRequest {
        operation_id: id(888),
        page_id: id(3),
        expected_hash: super::migration_plan::content_hash(&source),
        expected_revision: Some(0),
        source: source.replace("Multiple", "Edited"),
    };
    store
        .write_note_source(request, |_, _| Err("interrupted".into()))
        .unwrap();
    assert_eq!(
        page(&preview(directory.path()), "multi.md")["classification"],
        "pending"
    );
}
