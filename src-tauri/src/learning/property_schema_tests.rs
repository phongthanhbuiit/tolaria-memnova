use super::{CardDraft, Store};
use serde_json::json;

#[test]
fn schema_v3_upgrade_preserves_values_sources_and_memory_without_inferred_definitions() {
    let dir = tempfile::tempdir().unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    let owner = uuid::Uuid::new_v4().to_string();
    let source = uuid::Uuid::new_v4().to_string();
    for (id, path) in [(&owner, "owner.md"), (&source, "source.md")] {
        std::fs::write(
            dir.path().join(path),
            format!("---\n_memnova_page_id: {id}\n---\n# {path}\n"),
        )
        .unwrap();
        store.register_page(id, path, path).unwrap();
    }
    let card = store
        .create_card(
            &owner,
            CardDraft {
                property_definitions: None,
                front: "Recall".into(),
                back: "Keep".into(),
                answer_mode: "page".into(),
                answer_page_id: Some(source.clone()),
                status: "active".into(),
                position: 0,
                properties: json!({"flag":false,"zero":0,"nil":null,"opaque":{"retain":[1,false]}}),
            },
        )
        .unwrap();
    super::note_memory_fixture::remove_note_schema(&store);
    store.conn.execute_batch("DROP TABLE page_property_definitions; DROP TABLE card_property_definitions; PRAGMA user_version=3;").unwrap();
    drop(store);
    let upgraded = Store::open(dir.path()).unwrap();
    let retained = upgraded.get_card(&card.id).unwrap();
    assert_eq!(retained.properties, card.properties);
    assert_eq!(retained.schedule, card.schedule);
    assert_eq!(retained.answer_page_id, Some(source));
    assert_eq!(
        upgraded
            .conn
            .query_row(
                "SELECT count(*) FROM card_property_definitions",
                [],
                |row| row.get::<_, u32>(0)
            )
            .unwrap(),
        0
    );
    let backups = upgraded.list_backups().unwrap();
    assert_eq!(backups.len(), 1);
    assert!(upgraded.verify_backup(&backups[0].id).is_ok());
    let restored_path = upgraded.restore_local_backup(&backups[0].id).unwrap();
    let restored = Store::open(&restored_path).unwrap();
    assert_eq!(
        restored.get_card(&card.id).unwrap().properties,
        card.properties
    );
    assert_eq!(restored.get_card(&card.id).unwrap().schedule, card.schedule);
    let reopened = Store::open(dir.path()).unwrap();
    assert_eq!(reopened.list_backups().unwrap().len(), 1);
    assert_eq!(
        reopened
            .conn
            .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        super::SCHEMA_VERSION
    );
}
#[test]
fn property_definition_constraints_reject_unknown_owners_kinds_and_invalid_item_kinds() {
    let dir = tempfile::tempdir().unwrap();
    let store = Store::open(dir.path()).unwrap();
    assert!(store.conn.execute("INSERT INTO page_property_definitions(page_id,key,value_kind) VALUES('missing','flag','boolean')",[]).is_err());
    assert!(store.conn.execute("INSERT INTO card_property_definitions(card_id,key,value_kind) VALUES('missing','flag','boolean')",[]).is_err());
    let page = uuid::Uuid::new_v4().to_string();
    std::fs::write(dir.path().join("lesson.md"), "# Lesson").unwrap();
    let mut store = store;
    store.register_page(&page, "lesson.md", "Lesson").unwrap();
    for (kind, item) in [
        ("sql", None),
        ("list", None),
        ("number", Some("page")),
        ("list", Some("sql")),
    ] {
        assert!(store.conn.execute("INSERT INTO page_property_definitions(page_id,key,value_kind,item_kind) VALUES(?1,'test',?2,?3)",rusqlite::params![page,kind,item]).is_err());
    }
    store.conn.execute("INSERT INTO page_property_definitions(page_id,key,value_kind,item_kind) VALUES(?1,'links','list','page')",[page]).unwrap();
}

#[test]
fn failed_property_migration_rolls_back_both_tables_and_version() {
    let dir = tempfile::tempdir().unwrap();
    let store = Store::open(dir.path()).unwrap();
    super::note_memory_fixture::remove_note_schema(&store);
    store.conn.execute_batch("DROP TABLE page_property_definitions; DROP TABLE card_property_definitions; CREATE TABLE card_property_definitions(keep TEXT); INSERT INTO card_property_definitions VALUES('original'); PRAGMA user_version=3;").unwrap();
    drop(store);
    assert!(Store::open(dir.path()).is_err());
    let conn = rusqlite::Connection::open(dir.path().join(".memnova/learning.sqlite3")).unwrap();
    assert_eq!(
        conn.query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        3
    );
    assert_eq!(
        conn.query_row(
            "SELECT count(*) FROM sqlite_master WHERE name='page_property_definitions'",
            [],
            |row| row.get::<_, u32>(0)
        )
        .unwrap(),
        0
    );
    assert_eq!(
        conn.query_row("SELECT keep FROM card_property_definitions", [], |row| {
            row.get::<_, String>(0)
        })
        .unwrap(),
        "original"
    );
}
