use super::storage_metadata::write_metadata;
use super::{CardDraft, MigrationState, SessionScope, Store};
use serde_json::json;

fn fixture() -> (tempfile::TempDir, Store, String, String, String) {
    let dir = tempfile::tempdir().unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    let transaction = store.conn.transaction().unwrap();
    write_metadata(&transaction, "migrationState", &MigrationState::Ready).unwrap();
    transaction.commit().unwrap();
    std::fs::write(dir.path().join("owner.md"), "# Owner\n\nOwner content").unwrap();
    std::fs::write(dir.path().join("source.md"), "# Source\n\nLinked answer").unwrap();
    let owner = store.ensure_page("owner.md").unwrap();
    let source = store.ensure_page("source.md").unwrap();
    let card = store
        .create_card(
            &owner.id,
            CardDraft {
                property_definitions: None,
                front: "Recall source".into(),
                back: "Private inline answer".into(),
                answer_mode: "page".into(),
                answer_page_id: Some(source.id.clone()),
                status: "active".into(),
                position: 0,
                properties: json!({}),
            },
        )
        .unwrap();
    (dir, store, owner.id, source.id, card.id)
}
#[test]
fn live_source_follows_uuid_rename_but_never_replacement_by_same_filename() {
    let (dir, mut store, owner, source, card) = fixture();
    let session = store
        .start_session(SessionScope {
            page_ids: Some(vec![owner]),
        })
        .unwrap();
    let item = session.current.as_ref().unwrap();
    assert_eq!(item.page.as_ref().unwrap().path, "owner.md");
    assert_eq!(item.answer_page.as_ref().unwrap().id, source);
    assert!(item
        .answer_page
        .as_ref()
        .unwrap()
        .content
        .contains("Linked answer"));
    std::fs::rename(dir.path().join("source.md"), dir.path().join("renamed.md")).unwrap();
    store.sync_pages().unwrap();
    let current = store.get_session(&session.id).unwrap().current.unwrap();
    assert_eq!(current.answer_page.as_ref().unwrap().path, "renamed.md");
    assert_ne!(
        current.answer_page.as_ref().unwrap().fingerprint,
        item.answer_page.as_ref().unwrap().fingerprint
    );
    std::fs::remove_file(dir.path().join("renamed.md")).unwrap();
    std::fs::write(dir.path().join("renamed.md"), "# Unrelated replacement").unwrap();
    store.sync_pages().unwrap();
    let unavailable = store.get_session(&session.id).unwrap().current.unwrap();
    assert!(unavailable.page.is_some());
    assert!(unavailable.answer_page.is_none());
    assert!(unavailable.source_error.is_some());
    assert_eq!(store.get_card(&card).unwrap().schedule.reps, 0);
    assert_eq!(store.get_card(&card).unwrap().answer_page_id, Some(source));
}
#[test]
fn linked_source_is_not_a_deck_membership_edge_and_bad_source_does_not_erase_owner() {
    let (dir, mut store, _owner, source, _card) = fixture();
    let other = store
        .start_session(SessionScope {
            page_ids: Some(vec![source.clone()]),
        })
        .unwrap();
    assert_eq!(other.initial_count, 0);
    std::fs::write(dir.path().join("source.md"), "---\nbroken: [\n---\n").unwrap();
    let session = store.start_session(SessionScope::default()).unwrap();
    let item = session.current.unwrap();
    assert!(item.page.is_some());
    assert!(item.answer_page.is_none());
    assert!(item.source_error.is_some());
}

#[test]
fn original_source_identity_can_return_and_duplicates_are_reported_without_merging() {
    let (dir, mut store, owner, source, card) = fixture();
    let original = std::fs::read_to_string(dir.path().join("source.md")).unwrap();
    let session = store
        .start_session(SessionScope {
            page_ids: Some(vec![owner]),
        })
        .unwrap();
    std::fs::remove_file(dir.path().join("source.md")).unwrap();
    store.sync_pages().unwrap();
    assert!(store
        .get_session(&session.id)
        .unwrap()
        .current
        .unwrap()
        .source_error
        .is_some());
    std::fs::write(dir.path().join("source.md"), &original).unwrap();
    store.sync_pages().unwrap();
    assert_eq!(
        store
            .get_session(&session.id)
            .unwrap()
            .current
            .unwrap()
            .answer_page
            .unwrap()
            .id,
        source
    );
    std::fs::write(dir.path().join("duplicate.md"), original).unwrap();
    assert!(store.sync_pages().is_err());
    assert_eq!(store.get_card(&card).unwrap().answer_page_id, Some(source));
    assert_eq!(store.get_card(&card).unwrap().schedule.reps, 0);
}

#[test]
fn source_preview_reads_registered_identity_without_creating_a_session_or_review() {
    let (_dir, store, _owner, source, _card) = fixture();
    let page = store.read_study_page(&source).unwrap();
    assert!(page.content.contains("Linked answer"));
    assert!(!page.content.contains("_memnova_page_id"));
    assert!(store.read_study_page("../source.md").is_err());
    assert!(store
        .read_study_page(&uuid::Uuid::new_v4().to_string())
        .is_err());
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM sessions", [], |row| row
                .get::<_, u32>(0))
            .unwrap(),
        0
    );
}
