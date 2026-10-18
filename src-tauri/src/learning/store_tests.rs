use super::Store;

#[test]
fn opens_a_persistent_library_with_isolated_database_and_foreign_keys() {
    let first = tempfile::tempdir().unwrap();
    let second = tempfile::tempdir().unwrap();
    let initial = Store::open(first.path()).unwrap();
    let id = initial.library_id.clone();
    assert_eq!(
        initial
            .conn
            .query_row("PRAGMA foreign_keys", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        1
    );
    assert_eq!(
        initial
            .conn
            .query_row("PRAGMA journal_mode", [], |r| r.get::<_, String>(0))
            .unwrap(),
        "wal"
    );
    drop(initial);
    assert_eq!(Store::open(first.path()).unwrap().library_id, id);
    assert_ne!(Store::open(second.path()).unwrap().library_id, id);
}

#[test]
fn rejects_future_schema_without_replacing_user_data() {
    let dir = tempfile::tempdir().unwrap();
    let store = Store::open(dir.path()).unwrap();
    store.conn.execute_batch("CREATE TABLE future_user_data(value TEXT); INSERT INTO future_user_data VALUES('retained'); PRAGMA user_version=999;").unwrap();
    drop(store);
    assert!(Store::open(dir.path()).err().unwrap().contains("newer"));
    let conn = rusqlite::Connection::open(dir.path().join(".memnova/learning.sqlite3")).unwrap();
    assert_eq!(
        conn.query_row("SELECT value FROM future_user_data", [], |r| r
            .get::<_, String>(0))
            .unwrap(),
        "retained"
    );
}

#[test]
fn refuses_corrupt_manifest_without_regenerating_identity() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::create_dir(dir.path().join(".memnova")).unwrap();
    let path = dir.path().join(".memnova/library.json");
    std::fs::write(&path, "broken").unwrap();
    assert!(Store::open(dir.path()).is_err());
    assert_eq!(std::fs::read_to_string(path).unwrap(), "broken");
}

#[test]
fn page_identity_survives_rename_and_duplicate_ids_are_rejected() {
    let dir = tempfile::tempdir().unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    let id = uuid::Uuid::new_v4().to_string();
    std::fs::write(dir.path().join("first.md"), "# First").unwrap();
    store.register_page(&id, "first.md", "First").unwrap();
    std::fs::write(dir.path().join("copy.md"), "# Copy").unwrap();
    assert!(store.register_page(&id, "copy.md", "Copy").is_err());
    std::fs::rename(dir.path().join("first.md"), dir.path().join("renamed.md")).unwrap();
    store.register_page(&id, "renamed.md", "Renamed").unwrap();
    assert_eq!(
        store
            .conn
            .query_row("SELECT path FROM pages WHERE id=?1", [&id], |r| r
                .get::<_, String>(0))
            .unwrap(),
        "renamed.md"
    );
    assert!(store
        .register_page("not-a-uuid", "copy.md", "Copy")
        .is_err());
    assert!(store.register_page(&id, "../escape.md", "Escape").is_err());
}

#[cfg(unix)]
#[test]
fn never_follows_a_metadata_directory_symlink() {
    let dir = tempfile::tempdir().unwrap();
    let outside = tempfile::tempdir().unwrap();
    std::os::unix::fs::symlink(outside.path(), dir.path().join(".memnova")).unwrap();
    assert!(Store::open(dir.path()).is_err());
    assert_eq!(std::fs::read_dir(outside.path()).unwrap().count(), 0);
}

#[test]
fn learning_database_and_wal_never_enter_automatic_git_commits() {
    let dir = tempfile::tempdir().unwrap();
    assert!(std::process::Command::new("git")
        .args(["init", "-q"])
        .current_dir(dir.path())
        .status()
        .unwrap()
        .success());
    let _store = Store::open(dir.path()).unwrap();
    let status = std::process::Command::new("git")
        .args(["status", "--porcelain", "--", ".memnova"])
        .current_dir(dir.path())
        .output()
        .unwrap();
    assert!(status.status.success());
    assert_eq!(String::from_utf8(status.stdout).unwrap(), "");
}

#[test]
fn invalid_manifest_identity_and_future_manifest_format_never_reset_data() {
    let dir = tempfile::tempdir().unwrap();
    let store = Store::open(dir.path()).unwrap();
    drop(store);
    let path = dir.path().join(".memnova/library.json");
    for content in [
        r#"{"formatVersion":999,"libraryId":"unchanged"}"#,
        r#"{"formatVersion":1,"libraryId":"not-a-uuid"}"#,
    ] {
        std::fs::write(&path, content).unwrap();
        assert!(Store::open(dir.path()).is_err());
        assert_eq!(std::fs::read_to_string(&path).unwrap(), content);
    }
}

#[test]
fn corrupt_database_is_reported_without_replacing_its_bytes() {
    let dir = tempfile::tempdir().unwrap();
    let store = Store::open(dir.path()).unwrap();
    drop(store);
    let path = dir.path().join(".memnova/learning.sqlite3");
    std::fs::write(&path, b"not a sqlite database").unwrap();
    assert!(Store::open(dir.path()).is_err());
    assert_eq!(std::fs::read(&path).unwrap(), b"not a sqlite database");
}

#[test]
fn existing_metadata_ignore_cannot_reinclude_private_learning_data() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::create_dir(dir.path().join(".memnova")).unwrap();
    std::fs::write(
        dir.path().join(".memnova/.gitignore"),
        "# custom\n!learning.sqlite3\n",
    )
    .unwrap();
    let store = super::Store::open(dir.path()).unwrap();
    drop(store);
    let ignore = std::fs::read_to_string(dir.path().join(".memnova/.gitignore")).unwrap();
    assert!(ignore.starts_with("# custom\n!learning.sqlite3\n"));
    assert_eq!(ignore.lines().last(), Some("*"));
    let _reopen = super::Store::open(dir.path()).unwrap();
    assert_eq!(
        std::fs::read_to_string(dir.path().join(".memnova/.gitignore")).unwrap(),
        ignore
    );
}

#[test]
fn missing_sqlite_never_reopens_legacy_schedule_writes_for_an_existing_identity() {
    let directory = tempfile::tempdir().unwrap();
    let store = Store::open(directory.path()).unwrap();
    drop(store);
    std::fs::remove_file(directory.path().join(".memnova/learning.sqlite3")).unwrap();
    let called = std::cell::Cell::new(false);
    assert!(super::with_legacy_write(directory.path(), || {
        called.set(true);
        Ok(())
    })
    .is_err());
    assert!(!called.get());
    assert!(!directory.path().join(".memnova/learning.sqlite3").exists());
}
