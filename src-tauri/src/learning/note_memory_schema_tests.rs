use super::{
    note_memory_fixture::{fixture, id, remove_note_schema},
    Store,
};
use rusqlite::types::ValueRef;
use serde_json::{json, Value};

const OLD_TABLES: [&str; 11] = [
    "pages",
    "cards",
    "schedules",
    "reviews",
    "sessions",
    "decks",
    "deck_pages",
    "imports",
    "library_metadata",
    "page_property_definitions",
    "card_property_definitions",
];

fn rows(store: &Store) -> Value {
    let mut result = serde_json::Map::new();
    for table in OLD_TABLES {
        let mut statement = store
            .conn
            .prepare(&format!("SELECT * FROM {table} ORDER BY rowid"))
            .unwrap();
        let columns = statement.column_count();
        let rows: Vec<Vec<Value>> = statement
            .query_map([], |row| {
                (0..columns)
                    .map(|column| {
                        Ok(match row.get_ref(column)? {
                            ValueRef::Null => Value::Null,
                            ValueRef::Integer(value) => json!(value),
                            ValueRef::Real(value) => json!(value),
                            ValueRef::Text(value) => json!(std::str::from_utf8(value).unwrap()),
                            ValueRef::Blob(value) => json!(value),
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

fn v4_fixture() -> (tempfile::TempDir, Store) {
    let (directory, store) = fixture();
    remove_note_schema(&store);
    store.conn.execute_batch("PRAGMA user_version=4;").unwrap();
    (directory, store)
}

#[test]
fn v4_upgrade_is_backup_first_and_preserves_every_existing_row_and_note() {
    let (directory, store) = v4_fixture();
    let before = rows(&store);
    let path = directory.path().join("lesson.md");
    let bytes = std::fs::read(&path).unwrap();
    let modified = std::fs::metadata(&path).unwrap().modified().unwrap();
    let library_id = store.library_id.clone();
    drop(store);
    let upgraded = Store::open(directory.path()).unwrap();
    assert_eq!(
        upgraded
            .conn
            .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        5
    );
    assert_eq!(rows(&upgraded), before);
    assert_eq!(upgraded.library_id, library_id);
    assert_eq!(std::fs::read(&path).unwrap(), bytes);
    assert_eq!(
        std::fs::metadata(path).unwrap().modified().unwrap(),
        modified
    );
    for table in ["note_card_bindings", "note_learning_operations"] {
        assert_eq!(
            upgraded
                .conn
                .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| row
                    .get::<_, i64>(0))
                .unwrap(),
            0
        );
    }
    let backups = upgraded.list_backups().unwrap();
    assert_eq!(backups.len(), 1);
    upgraded.verify_backup(&backups[0].id).unwrap();
    let old = rusqlite::Connection::open(directory.path().join(format!(
        ".memnova/backups/{}/files/.memnova/learning.sqlite3",
        backups[0].id
    )))
    .unwrap();
    assert_eq!(
        old.query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        4
    );
}

#[test]
fn bindings_enforce_one_card_per_note_and_matching_card_owner() {
    let (_directory, store) = fixture();
    let insert =
        "INSERT INTO note_card_bindings(page_id,card_id,source_hash,revision) VALUES(?1,?2,?3,?4)";
    for (page, card, hash, revision) in [
        (3, 101, "0".repeat(64), 0),
        (2, 999, "0".repeat(64), 0),
        (2, 101, "x".into(), 0),
        (2, 101, "A".repeat(64), 0),
        (2, 101, "0".repeat(64), -1),
    ] {
        assert!(store
            .conn
            .execute(
                insert,
                rusqlite::params![id(page), id(card), hash, revision]
            )
            .is_err());
    }
    store
        .conn
        .execute(insert, rusqlite::params![id(2), id(101), "0".repeat(64), 0])
        .unwrap();
    assert!(store
        .conn
        .execute(insert, rusqlite::params![id(2), id(102), "0".repeat(64), 0])
        .is_err());
    assert_eq!(store.get_card(&id(101)).unwrap().schedule.reps, 7);
    assert_eq!(
        store.note_binding(&id(2)).unwrap().unwrap().card_id,
        id(101)
    );
    assert!(store.note_binding(&id(3)).unwrap().is_none());
    assert!(store.note_binding("invalid").is_err());
    store
        .conn
        .execute_batch("PRAGMA foreign_keys=OFF;")
        .unwrap();
    store
        .conn
        .execute("UPDATE note_card_bindings SET card_id=?1", [id(102)])
        .unwrap();
    assert!(store.note_binding(&id(2)).is_err());
}

#[test]
fn journal_rejects_unknown_states_invalid_json_and_missing_owners() {
    let (_directory, store) = fixture();
    let insert = "INSERT INTO note_learning_operations(id,page_id,kind,payload_json,phase,created_at) VALUES(?1,?2,?3,?4,?5,?6)";
    for (owner, kind, payload, phase, time) in [
        (None, "sql", r#"{"version":1}"#, "prepared", 1),
        (None, "save", r#"{"version":1}"#, "skip", 1),
        (None, "save", "broken", "prepared", 1),
        (None, "save", "{}", "prepared", 1),
        (None, "save", r#"{"version":2}"#, "prepared", 1),
        (None, "save", r#"{"version":true}"#, "prepared", 1),
        (None, "save", r#"{"version":1}"#, "prepared", -1),
        (Some(id(999)), "save", r#"{"version":1}"#, "prepared", 1),
    ] {
        assert!(store
            .conn
            .execute(
                insert,
                rusqlite::params![id(701), owner, kind, payload, phase, time]
            )
            .is_err());
    }
    store
        .conn
        .execute(
            insert,
            rusqlite::params![
                id(701),
                Option::<String>::None,
                "configure",
                r#"{"version":1}"#,
                "prepared",
                1000
            ],
        )
        .unwrap();
}

#[test]
fn failed_v5_migration_rolls_back_first_table_and_keeps_existing_data() {
    let (directory, store) = v4_fixture();
    let before = rows(&store);
    store.conn.execute_batch("CREATE TABLE note_learning_operations(original TEXT); INSERT INTO note_learning_operations VALUES('keep');").unwrap();
    drop(store);
    assert!(Store::open(directory.path()).is_err());
    let connection =
        rusqlite::Connection::open(directory.path().join(".memnova/learning.sqlite3")).unwrap();
    assert_eq!(
        connection
            .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        4
    );
    assert_eq!(
        connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE name='note_card_bindings'",
                [],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
        0
    );
    assert_eq!(
        connection
            .query_row("SELECT original FROM note_learning_operations", [], |row| {
                row.get::<_, String>(0)
            })
            .unwrap(),
        "keep"
    );
    let store = Store {
        conn: connection,
        root: directory.path().canonicalize().unwrap(),
        library_id: String::new(),
    };
    assert_eq!(rows(&store), before);
}
