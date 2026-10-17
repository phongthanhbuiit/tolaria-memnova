use super::{CardDraft, Store};
use serde_json::json;

fn fixture() -> (tempfile::TempDir, Store, String, String) {
    let dir = tempfile::tempdir().unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    let owner = uuid::Uuid::new_v4().to_string();
    let source = uuid::Uuid::new_v4().to_string();
    for (id, path) in [(&owner, "owner.md"), (&source, "source.md")] {
        std::fs::write(
            dir.path().join(path),
            format!("---\n_memnova_page_id: {id}\n---\n# {path}\n\nOriginal content\n"),
        )
        .unwrap();
        store.register_page(id, path, path).unwrap();
    }
    (dir, store, owner, source)
}
fn draft(source: Option<String>) -> CardDraft {
    CardDraft {
        front: "Recall the source".into(),
        back: "Retained private answer".into(),
        answer_mode: "page".into(),
        answer_page_id: source,
        status: "active".into(),
        position: 0,
        properties: json!({"opaque":{"keep":[1,false]}}),
    }
}
#[test]
fn linked_answer_keeps_owner_and_clone_has_fresh_identity_and_memory() {
    let (_dir, mut store, owner, source) = fixture();
    let card = store
        .create_card(&owner, draft(Some(source.clone())))
        .unwrap();
    assert_eq!(card.page_id, owner);
    assert_eq!(card.answer_page_id.as_deref(), Some(source.as_str()));
    let cloned = store.clone_card(&card.id).unwrap();
    assert_eq!(cloned.answer_page_id, card.answer_page_id);
    assert_eq!(cloned.properties, card.properties);
    assert_ne!(cloned.id, card.id);
    assert_eq!(cloned.status, "draft");
    let mut changed = card.draft.clone();
    changed.answer_page_id = None;
    let updated = store.update_card(&card.id, card.revision, changed).unwrap();
    assert_eq!(updated.schedule, card.schedule);
    assert_eq!(updated.back, "Retained private answer");
    assert!(store
        .create_card(&owner, draft(Some(uuid::Uuid::new_v4().to_string())))
        .is_err());
    let mut invalid = draft(Some(source));
    invalid.answer_mode = "inline".into();
    assert!(store.create_card(&owner, invalid).is_err());
}
#[test]
fn schema_v2_upgrade_is_backup_first_and_preserves_existing_card_data() {
    let (dir, mut store, owner, _) = fixture();
    let card = store.create_card(&owner, draft(None)).unwrap();
    store.conn.execute_batch("DROP INDEX cards_answer_page; ALTER TABLE cards DROP COLUMN answer_page_id; PRAGMA user_version=2;").unwrap();
    drop(store);
    let upgraded = Store::open(dir.path()).unwrap();
    let retained = upgraded.get_card(&card.id).unwrap();
    assert_eq!(retained.schedule, card.schedule);
    assert_eq!(retained.properties, card.properties);
    assert_eq!(retained.answer_page_id, None);
    assert_eq!(upgraded.list_backups().unwrap().len(), 1);
    let again = Store::open(dir.path()).unwrap();
    assert_eq!(again.list_backups().unwrap().len(), 1);
    assert_eq!(
        again
            .conn
            .query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        super::SCHEMA_VERSION
    );
}
#[test]
fn failed_additive_upgrade_rolls_back_without_replacing_database() {
    let (dir, store, _, _) = fixture();
    store.conn.execute_batch("DROP INDEX cards_answer_page; ALTER TABLE cards DROP COLUMN answer_page_id; CREATE TABLE cards_answer_page(value TEXT); INSERT INTO cards_answer_page VALUES('keep'); PRAGMA user_version=2;").unwrap();
    drop(store);
    assert!(Store::open(dir.path()).is_err());
    let conn = rusqlite::Connection::open(dir.path().join(".memnova/learning.sqlite3")).unwrap();
    assert_eq!(
        conn.query_row("PRAGMA user_version", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        2
    );
    assert_eq!(
        conn.query_row("SELECT value FROM cards_answer_page", [], |row| row
            .get::<_, String>(0))
            .unwrap(),
        "keep"
    );
    assert!(conn.prepare("SELECT answer_page_id FROM cards").is_err());
}
