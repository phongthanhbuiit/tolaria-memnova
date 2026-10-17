use super::property_definitions::{PropertyDefinition, PropertyDefinitions};
use super::storage_metadata::write_metadata;
use super::{CardDraft, MigrationState, Store};
use serde_json::json;
fn hints(key: &str, kind: &str) -> PropertyDefinitions {
    [(
        key.into(),
        PropertyDefinition {
            value_kind: kind.into(),
            item_kind: None,
        },
    )]
    .into()
}
fn fixture() -> (tempfile::TempDir, Store, String) {
    let dir = tempfile::tempdir().unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    let tx = store.conn.transaction().unwrap();
    write_metadata(&tx, "migrationState", &MigrationState::Ready).unwrap();
    tx.commit().unwrap();
    std::fs::write(dir.path().join("page.md"), "# Page").unwrap();
    let page = store.ensure_page("page.md").unwrap();
    (dir, store, page.id)
}
fn draft() -> CardDraft {
    CardDraft {
        front: "Question".into(),
        back: "Answer".into(),
        answer_mode: "inline".into(),
        answer_page_id: None,
        status: "active".into(),
        position: 0,
        properties: json!({"flag":false,"zero":0,"nil":null,"opaque":{"keep":[false,1]}}),
        property_definitions: Some(hints("flag", "boolean")),
    }
}
#[test]
fn card_values_definitions_revision_are_atomic_and_exact_retry_is_idempotent() {
    let (_dir, mut store, page) = fixture();
    let card = store.create_card(&page, draft()).unwrap();
    let mut change = card.draft.clone();
    change.properties["flag"] = json!(true);
    store.conn.execute_batch("CREATE TRIGGER fail_hint BEFORE INSERT ON card_property_definitions BEGIN SELECT RAISE(ABORT,'hint failure'); END;").unwrap();
    assert!(store.update_card(&card.id, 0, change.clone()).is_err());
    let retained = store.get_card(&card.id).unwrap();
    assert_eq!(retained.draft, card.draft);
    assert_eq!(retained.revision, 0);
    store.conn.execute_batch("DROP TRIGGER fail_hint;").unwrap();
    let saved = store.update_card(&card.id, 0, change.clone()).unwrap();
    let replay = store.update_card(&card.id, 0, change.clone()).unwrap();
    assert_eq!(saved.revision, replay.revision);
    assert_eq!(replay.schedule, card.schedule);
    change.back = "Different stale draft".into();
    assert!(store.update_card(&card.id, 0, change).is_err());
    let clone = store.clone_card(&card.id).unwrap();
    assert_eq!(clone.property_definitions, saved.property_definitions);
    assert_eq!(clone.schedule.reps, 0);
    let mut legacy = saved.draft.clone();
    legacy.property_definitions = None;
    legacy.back = "Legacy client".into();
    let saved = store.update_card(&card.id, 1, legacy).unwrap();
    assert_eq!(saved.property_definitions, card.property_definitions);
}
#[test]
fn page_hint_compare_and_swap_retries_without_touching_markdown() {
    let (dir, mut store, page) = fixture();
    let raw = std::fs::read(dir.path().join("page.md")).unwrap();
    let empty = PropertyDefinitions::new();
    let next = hints("deadline", "date");
    assert_eq!(
        store
            .set_page_property_definitions(&page, &empty, &next)
            .unwrap(),
        next
    );
    assert_eq!(
        store
            .set_page_property_definitions(&page, &empty, &next)
            .unwrap(),
        next
    );
    assert!(store
        .set_page_property_definitions(&page, &empty, &hints("flag", "boolean"))
        .is_err());
    assert!(store
        .page_property_definitions(&uuid::Uuid::new_v4().to_string())
        .is_err());
    assert!(store
        .set_page_property_definitions(&page, &next, &hints("_fsrs", "number"))
        .is_err());
    assert_eq!(std::fs::read(dir.path().join("page.md")).unwrap(), raw);
}
#[test]
fn invalid_typed_values_do_not_replace_opaque_or_falsy_properties() {
    let (_dir, mut store, page) = fixture();
    let card = store.create_card(&page, draft()).unwrap();
    let mut invalid = card.draft.clone();
    invalid.properties["flag"] = json!("false");
    assert!(store.update_card(&card.id, 0, invalid).is_err());
    assert_eq!(
        store.get_card(&card.id).unwrap().properties,
        card.properties
    );
    let mut invalid = draft();
    invalid.property_definitions = Some(hints("nil", "date"));
    assert!(store.create_card(&page, invalid).is_err());
}
#[test]
fn unrelated_card_edit_preserves_legacy_integers_after_javascript_projection() {
    let (_dir, mut store, page) = fixture();
    let card = store.create_card(&page, draft()).unwrap();
    let original: serde_json::Value = serde_json::from_str(
        r#"{"large":9007199254740993,"nested":{"list":[18446744073709551615]},"flag":false}"#,
    )
    .unwrap();
    store
        .conn
        .execute(
            "UPDATE cards SET properties_json=?1 WHERE id=?2",
            rusqlite::params![original.to_string(), card.id],
        )
        .unwrap();
    let mut incoming = store.get_card(&card.id).unwrap().draft;
    incoming.back = "Changed back".into();
    incoming.properties = serde_json::from_str(
        r#"{"large":9007199254740992,"nested":{"list":[18446744073709552000]},"flag":false}"#,
    )
    .unwrap();
    let saved = store.update_card(&card.id, 0, incoming).unwrap();
    assert_eq!(saved.properties, original);
}
#[test]
fn typed_page_references_require_registered_same_library_identity() {
    let (_dir, mut store, page) = fixture();
    let mut draft = draft();
    draft.properties["source"] = json!({"pageId":uuid::Uuid::new_v4().to_string()});
    draft.property_definitions = Some(hints("source", "page"));
    assert!(store.create_card(&page, draft.clone()).is_err());
    draft.properties["source"] = json!({"pageId":page});
    assert!(store.create_card(&page, draft).is_ok());
}

#[test]
fn definition_validation_covers_dates_lists_names_and_mismatches() {
    use super::property_definitions::{validate_definitions, validate_values};
    for (value, kind, item) in [
        (json!("2028-02-29"), "date", None),
        (json!([]), "list", Some("text")),
        (json!(["", "a,b"]), "list", Some("text")),
        (
            json!([{"pageId":uuid::Uuid::new_v4().to_string()}]),
            "list",
            Some("page"),
        ),
        (json!(0), "number", None),
    ] {
        let mut definitions = hints("field", kind);
        definitions.get_mut("field").unwrap().item_kind = item.map(str::to_string);
        assert!(validate_values(&json!({"field":value}), &definitions).is_ok());
    }
    for value in [json!("2026-02-29"), json!("2026-13-01"), json!(null)] {
        assert!(validate_values(&json!({"field":value}), &hints("field", "date")).is_err());
    }
    for key in ["", " name", "_memnova", "Revision", &"a".repeat(257)] {
        assert!(validate_definitions(&hints(key, "text")).is_err());
    }
    assert!(validate_definitions(&hints("field", "unknown")).is_err());
    assert!(validate_definitions(&hints("field", "list")).is_err());
    let mut invalid = hints("field", "text");
    invalid.get_mut("field").unwrap().item_kind = Some("text".into());
    assert!(validate_definitions(&invalid).is_err());
    assert!(validate_values(&json!({}), &hints("field", "text")).is_err());
    assert!(validate_values(
        &json!({"field":9007199254740992_u64}),
        &hints("field", "number")
    )
    .is_err());
    let many = (0..257)
        .map(|index| {
            (
                format!("field{index}"),
                PropertyDefinition {
                    value_kind: "text".into(),
                    item_kind: None,
                },
            )
        })
        .collect();
    assert!(validate_definitions(&many).is_err());
}
