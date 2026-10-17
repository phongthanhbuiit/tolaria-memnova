use super::{CardDraft, Store};
use serde_json::json;

fn fixture() -> (tempfile::TempDir, Store, String) {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(
        dir.path().join("lesson.md"),
        "# Lesson\n\nFull lesson stays here.\n",
    )
    .unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    let page = uuid::Uuid::new_v4().to_string();
    store.register_page(&page, "lesson.md", "Lesson").unwrap();
    (dir, store, page)
}

fn draft(front: &str) -> CardDraft {
    CardDraft {
        front: front.into(),
        back: "Answer".into(),
        answer_mode: "inline".into(),
        status: "active".into(),
        position: 0,
        properties: json!({"IPA":"test", "image":"attachments/picture.png"}),
    }
}

#[test]
fn one_page_owns_many_cards_with_independent_schedules_and_retained_media() {
    let (dir, mut store, page) = fixture();
    let first = store.create_card(&page, draft("Question one")).unwrap();
    let second = store.create_card(&page, draft("Question two")).unwrap();
    assert_ne!(first.id, second.id);
    assert_eq!(store.list_cards(Some(&page), false).unwrap().len(), 2);
    assert_eq!(first.properties["image"], "attachments/picture.png");
    assert_eq!(first.schedule.reps, 0);
    assert_eq!(first.schedule.engine, "legacy-fsrs5");
    assert_eq!(
        std::fs::read_to_string(dir.path().join("lesson.md")).unwrap(),
        "# Lesson\n\nFull lesson stays here.\n"
    );
    assert!(store
        .create_card(&uuid::Uuid::new_v4().to_string(), draft("Missing page"))
        .is_err());
}

#[test]
fn edits_keep_schedules_and_reject_stale_revisions() {
    let (_dir, mut store, page) = fixture();
    let card = store.create_card(&page, draft("Original")).unwrap();
    let updated = store
        .update_card(&card.id, card.revision, draft("Updated"))
        .unwrap();
    assert_eq!(updated.front, "Updated");
    assert_eq!(updated.schedule, card.schedule);
    assert_eq!(updated.revision, card.revision + 1);
    assert!(store
        .update_card(&card.id, card.revision, draft("Stale"))
        .is_err());
    assert_eq!(store.get_card(&card.id).unwrap().front, "Updated");
}

#[test]
fn drafts_allow_empty_questions_but_active_cards_require_valid_answers() {
    let (_dir, mut store, page) = fixture();
    assert!(store.create_card(&page, draft(" ")).is_err());
    let mut data = draft("");
    data.back.clear();
    data.status = "draft".into();
    let card = store.create_card(&page, data.clone()).unwrap();
    data.status = "active".into();
    data.front = "Explain the page".into();
    data.answer_mode = "page".into();
    assert!(store
        .update_card(&card.id, card.revision, data.clone())
        .is_ok());
    data.answer_mode = "inline".into();
    assert!(store.create_card(&page, data.clone()).is_err());
    data.answer_mode = "unknown".into();
    assert!(store.create_card(&page, data).is_err());
}

#[test]
fn clone_starts_fresh_and_trash_is_recoverable() {
    let (_dir, mut store, page) = fixture();
    let card = store.create_card(&page, draft("Original")).unwrap();
    let clone = store.clone_card(&card.id).unwrap();
    assert_ne!(clone.id, card.id);
    assert_eq!(clone.front, card.front);
    assert_eq!(clone.status, "draft");
    let mut trashed = draft("Original");
    trashed.status = "trashed".into();
    let deleted = store.update_card(&card.id, card.revision, trashed).unwrap();
    assert_eq!(store.list_cards(Some(&page), false).unwrap().len(), 1);
    assert_eq!(store.list_cards(Some(&page), true).unwrap().len(), 2);
    let mut restored = deleted.draft.clone();
    restored.status = "draft".into();
    assert!(store
        .update_card(&card.id, deleted.revision, restored)
        .is_ok());
    assert_eq!(store.list_cards(Some(&page), false).unwrap().len(), 2);
}

#[test]
fn invalid_metadata_and_corrupt_stored_json_are_reported_instead_of_erased() {
    let (_dir, mut store, page) = fixture();
    let mut invalid = draft("Question");
    invalid.properties = json!([]);
    assert!(store.create_card(&page, invalid).is_err());
    let card = store.create_card(&page, draft("Question")).unwrap();
    store
        .conn
        .execute(
            "UPDATE cards SET properties_json='broken' WHERE id=?1",
            [&card.id],
        )
        .unwrap();
    assert!(store.get_card(&card.id).is_err());
    assert!(store.list_cards(None, true).is_err());
    assert_eq!(
        store
            .conn
            .query_row(
                "SELECT properties_json FROM cards WHERE id=?1",
                [&card.id],
                |row| row.get::<_, String>(0)
            )
            .unwrap(),
        "broken"
    );
}

#[test]
fn trash_must_restore_unchanged_to_draft_before_any_edit_or_clone() {
    let (_dir, mut store, page) = fixture();
    let card = store.create_card(&page, draft("Original")).unwrap();
    let mut data = card.draft.clone();
    data.status = "trashed".into();
    let trashed = store
        .update_card(&card.id, card.revision, data.clone())
        .unwrap();
    for status in ["active", "suspended"] {
        data.status = status.into();
        assert!(store
            .update_card(&card.id, trashed.revision, data.clone())
            .is_err());
    }
    assert!(store.clone_card(&card.id).is_err());
    data.status = "draft".into();
    data.front = "Changed".into();
    assert!(store
        .update_card(&card.id, trashed.revision, data.clone())
        .is_err());
    data.front = card.front.clone();
    let restored = store.update_card(&card.id, trashed.revision, data).unwrap();
    assert_eq!(restored.schedule, card.schedule);
    assert_eq!(restored.status, "draft");
}
