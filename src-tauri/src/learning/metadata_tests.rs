use super::{CardDraft, Store};
use serde_json::json;

#[test]
fn schema_v1_upgrade_preserves_existing_cards_schedules_and_library_identity() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("lesson.md"), "# Original lesson\n").unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    let id = store.library_id.clone();
    let page = uuid::Uuid::new_v4().to_string();
    store.register_page(&page, "lesson.md", "Lesson").unwrap();
    let card = store
        .create_card(
            &page,
            CardDraft {
                property_definitions: None,
                answer_page_id: None,
                front: "Q".into(),
                back: "A".into(),
                answer_mode: "inline".into(),
                status: "active".into(),
                position: 0,
                properties: json!({"IPA":"original"}),
            },
        )
        .unwrap();
    super::note_memory_fixture::remove_note_schema(&store);
    store
        .conn
        .execute_batch("DROP TABLE page_property_definitions; DROP TABLE card_property_definitions; DROP INDEX cards_answer_page; ALTER TABLE cards DROP COLUMN answer_page_id; DROP TABLE library_metadata; PRAGMA user_version=1;")
        .unwrap();
    drop(store);
    let upgraded = Store::open(dir.path()).unwrap();
    assert_eq!(upgraded.library_id, id);
    assert_eq!(upgraded.get_card(&card.id).unwrap().schedule, card.schedule);
    assert_eq!(
        upgraded.get_card(&card.id).unwrap().properties,
        card.properties
    );
    assert_eq!(
        upgraded
            .conn
            .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        super::SCHEMA_VERSION
    );
    assert_eq!(
        upgraded.migration_state().unwrap(),
        super::MigrationState::Legacy
    );
    assert_eq!(
        std::fs::read_to_string(dir.path().join("lesson.md")).unwrap(),
        "# Original lesson\n"
    );
}

#[test]
fn database_owner_identity_must_match_the_library_manifest() {
    let first = tempfile::tempdir().unwrap();
    let second = tempfile::tempdir().unwrap();
    let first_store = Store::open(first.path()).unwrap();
    let original_id = first_store.library_id.clone();
    drop(first_store);
    drop(Store::open(second.path()).unwrap());
    std::fs::copy(
        second.path().join(".memnova/library.json"),
        first.path().join(".memnova/library.json"),
    )
    .unwrap();
    assert!(Store::open(first.path())
        .err()
        .unwrap()
        .contains("identity"));
    let connection =
        rusqlite::Connection::open(first.path().join(".memnova/learning.sqlite3")).unwrap();
    let saved: String = connection
        .query_row(
            "SELECT value_json FROM library_metadata WHERE key='libraryId'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(serde_json::from_str::<String>(&saved).unwrap(), original_id);
}

#[test]
fn malformed_metadata_is_not_silently_replaced_with_defaults() {
    let dir = tempfile::tempdir().unwrap();
    let store = Store::open(dir.path()).unwrap();
    store
        .conn
        .execute(
            "UPDATE library_metadata SET value_json='broken' WHERE key='migrationState'",
            [],
        )
        .unwrap();
    assert!(store.migration_state().is_err());
    assert_eq!(
        store
            .conn
            .query_row(
                "SELECT value_json FROM library_metadata WHERE key='migrationState'",
                [],
                |row| row.get::<_, String>(0)
            )
            .unwrap(),
        "broken"
    );
}
