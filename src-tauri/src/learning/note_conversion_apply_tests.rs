use super::{
    note_memory_fixture::id,
    note_write::{Checkpoint, NoteWriteHooks, NoteWriteStatus},
    Store,
};
use serde_json::json;
use std::fs;

use super::note_conversion_test_support::{
    apply, change_dependency, count, pending_dependency, protected, selection, setup, CHECKPOINTS,
};

#[test]
fn reusing_explicit_same_goal_preserves_every_schedule_review_property_and_legacy_snapshot() {
    let (directory, mut store) = setup();
    let choice = selection(&store, 2, Some(101));
    let original = store.get_card(&id(101)).unwrap();
    let protected_before = protected(&store);
    let before_source = fs::read_to_string(directory.path().join("lesson.md")).unwrap();
    let result = apply(&mut store, choice.clone()).unwrap();
    assert_eq!(result.outcome.status, NoteWriteStatus::Committed);
    assert_eq!(result.card_id, id(101));
    assert_eq!(count(&store, "cards"), 3);
    assert_eq!(
        store.note_binding(&id(2)).unwrap().unwrap().card_id,
        id(101)
    );
    assert_eq!(store.get_card(&id(101)).unwrap().draft, original.draft);
    assert_eq!(protected(&store), protected_before);
    let source = fs::read_to_string(directory.path().join("lesson.md")).unwrap();
    assert!(source.contains("_memnova_learning_enabled: true"));
    let document = super::note_memory::parse_document(&source);
    assert_eq!(
        document.front,
        super::note_memory::parse_document(&before_source).front
    );
    assert_eq!(
        document.back,
        super::note_memory::parse_document(&before_source).back
    );
    store.verify_backup(&result.backup_id).unwrap();
    let detail = store.note_conversion_details(&id(801)).unwrap();
    assert_eq!(detail.before_source, before_source);
    assert_eq!(detail.after_source, source);
    assert_eq!(detail.legacy_cards[0].card.id, id(101));
    fs::write(
        directory.path().join("lesson.md"),
        "External source after receipt",
    )
    .unwrap();
    let replay = apply(&mut store, choice).unwrap();
    assert_eq!(
        serde_json::to_value(replay).unwrap(),
        serde_json::to_value(result).unwrap()
    );
    assert_eq!(count(&store, "note_learning_operations"), 1);
    assert_eq!(protected(&store), protected_before);
}

#[test]
fn choosing_sql_faces_changes_only_the_selected_note_not_compatibility_properties() {
    let (directory, mut store) = setup();
    let mut choice = selection(&store, 2, Some(101));
    choice["front"] = json!({"kind":"card","cardId":id(101)});
    choice["back"]["source"] = json!({"kind":"card","cardId":id(101)});
    let card = store.get_card(&id(101)).unwrap();
    let before = protected(&store);
    apply(&mut store, choice).unwrap();
    let source = fs::read_to_string(directory.path().join("lesson.md")).unwrap();
    let document = super::note_memory::parse_document(&source);
    assert_eq!(document.front.trim_end(), card.front);
    assert_eq!(document.back, card.back);
    assert!(source.contains("context: {keep: [false, 9007199254740993]}"));
    assert!(!source.contains("topics:"));
    assert_eq!(protected(&store), before);
    assert_eq!(store.get_card(&id(101)).unwrap().draft, card.draft);
}

#[test]
fn new_goal_creates_fresh_memory_and_leaves_all_previous_cards_and_history_unchanged() {
    let (_directory, mut store) = setup();
    let choice = selection(&store, 2, None);
    let old_cards = super::note_conversion_cards::rows_fingerprint(
        &store.conn,
        "SELECT * FROM cards WHERE ?1 IS NOT NULL ORDER BY id",
        "capture",
    )
    .unwrap();
    let before = protected(&store);
    let result = apply(&mut store, choice).unwrap();
    assert_ne!(result.card_id, id(101));
    assert_eq!(count(&store, "cards"), 4);
    let fresh = store.get_card(&result.card_id).unwrap();
    assert_eq!(fresh.schedule.state, "new");
    assert_eq!(fresh.schedule.reps, 0);
    assert_eq!(fresh.schedule.lapses, 0);
    assert_eq!(fresh.schedule.stability, 0.0);
    assert_eq!(fresh.schedule.difficulty, 0.0);
    assert_eq!(fresh.properties, json!({}));
    assert_eq!(
        super::note_conversion_cards::rows_fingerprint(
            &store.conn,
            "SELECT * FROM cards WHERE id!=?1 ORDER BY id",
            &result.card_id
        )
        .unwrap(),
        old_cards
    );
    assert_eq!(protected(&store), before);
    assert_eq!(result.retained_legacy_cards, 1);
    assert_eq!(
        store.list_legacy_cards(Some(&id(2)), true).unwrap().len(),
        1
    );
}

#[test]
fn selecting_one_of_multiple_cards_never_merges_or_drops_survivors() {
    let (_directory, mut store) = setup();
    let choice = selection(&store, 3, Some(102));
    let original = serde_json::to_value(store.get_card(&id(103)).unwrap()).unwrap();
    let before = protected(&store);
    let result = apply(&mut store, choice).unwrap();
    assert_eq!(result.retained_legacy_cards, 1);
    assert_eq!(count(&store, "cards"), 3);
    assert_eq!(
        serde_json::to_value(store.get_card(&id(103)).unwrap()).unwrap(),
        original
    );
    assert_eq!(protected(&store), before);
    assert_eq!(
        store.list_legacy_cards(Some(&id(3)), true).unwrap()[0].id,
        id(103)
    );
}

#[test]
fn invalid_or_unconfirmed_or_stale_choices_do_not_write_files_rows_or_backups() {
    for invalid in [
        "source",
        "card",
        "confirmation",
        "unknown",
        "trashed",
        "active",
    ] {
        let (directory, mut store) = setup();
        let mut choice = selection(&store, 2, Some(101));
        match invalid {
            "source" => fs::write(directory.path().join("lesson.md"), "External update").unwrap(),
            "card" => {
                store
                    .conn
                    .execute(
                        "UPDATE schedules SET stability=30 WHERE card_id=?1",
                        [id(101)],
                    )
                    .unwrap();
            }
            "confirmation" => choice["memory"]["confirmedSameGoal"] = json!(false),
            "unknown" => choice["front"]["unsafe"] = json!(true),
            "trashed" => {
                store
                    .conn
                    .execute("UPDATE cards SET status='trashed' WHERE id=?1", [id(101)])
                    .unwrap();
                choice = selection(&store, 2, Some(101));
            }
            _ => {
                store
                    .conn
                    .execute("UPDATE sessions SET status='active'", [])
                    .unwrap();
                choice = selection(&store, 2, Some(101));
            }
        }
        let before = protected(&store);
        let bytes = fs::read(directory.path().join("lesson.md")).unwrap();
        assert!(apply(&mut store, choice).is_err(), "{invalid}");
        assert_eq!(count(&store, "note_learning_operations"), 0);
        assert_eq!(count(&store, "note_card_bindings"), 0);
        assert_eq!(protected(&store), before);
        assert_eq!(fs::read(directory.path().join("lesson.md")).unwrap(), bytes);
        assert!(store.list_backups().unwrap().is_empty());
    }
}

#[test]
fn restart_at_every_source_checkpoint_reuses_immutable_ids_and_keeps_both_snapshots() {
    for checkpoint in CHECKPOINTS {
        let (directory, mut store) = setup();
        let choice = selection(&store, 2, None);
        let before = protected(&store);
        assert!(store
            .apply_note_conversion_with_hooks(
                serde_json::from_value(choice.clone()).unwrap(),
                &NoteWriteHooks::stop_at(checkpoint)
            )
            .is_err());
        let detail = store.note_conversion_details(&id(801)).unwrap();
        store.verify_backup(&detail.backup_id).unwrap();
        let card_id = detail.card_id.clone();
        drop(store);
        let mut store = Store::open(directory.path()).unwrap();
        let outcome = store.resume_note_conversion(&id(801)).unwrap();
        assert_eq!(
            outcome.outcome.status,
            NoteWriteStatus::Committed,
            "{checkpoint:?}"
        );
        assert_eq!(outcome.card_id, card_id);
        assert_eq!(count(&store, "cards"), 4);
        assert_eq!(count(&store, "note_learning_operations"), 1);
        assert_eq!(count(&store, "note_card_bindings"), 1);
        assert_eq!(protected(&store), before);
        assert_eq!(
            store
                .note_conversion_details(&id(801))
                .unwrap()
                .before_source,
            detail.before_source
        );
        assert_eq!(
            store
                .note_conversion_details(&id(801))
                .unwrap()
                .after_source,
            detail.after_source
        );
        assert_eq!(store.list_backups().unwrap().len(), 1);
        apply(&mut store, choice).unwrap();
        assert_eq!(count(&store, "cards"), 4);
    }
}

#[test]
fn resumed_conversion_preserves_external_source_and_reports_conflict() {
    let (directory, mut store) = setup();
    let choice = selection(&store, 2, Some(101));
    store
        .apply_note_conversion_with_hooks(
            serde_json::from_value(choice).unwrap(),
            &NoteWriteHooks::stop_at(Checkpoint::Prepared),
        )
        .unwrap_err();
    let before = protected(&store);
    fs::write(
        directory.path().join("lesson.md"),
        "External text preserved",
    )
    .unwrap();
    let result = store.resume_note_conversion(&id(801)).unwrap();
    assert_eq!(result.outcome.status, NoteWriteStatus::Conflict);
    assert_eq!(
        fs::read_to_string(directory.path().join("lesson.md")).unwrap(),
        "External text preserved"
    );
    assert_eq!(count(&store, "note_card_bindings"), 0);
    assert_eq!(protected(&store), before);
}

#[test]
fn a_failed_conversion_transaction_rolls_back_and_can_resume_once_after_reopen() {
    let (directory, mut store) = setup();
    let choice = selection(&store, 2, Some(101));
    store.conn.execute_batch("CREATE TRIGGER fail_binding BEFORE INSERT ON note_card_bindings BEGIN SELECT RAISE(ABORT,'test IO boundary'); END;").unwrap();
    let before = protected(&store);
    let card = serde_json::to_value(store.get_card(&id(101)).unwrap()).unwrap();
    let result = apply(&mut store, choice).unwrap();
    assert_eq!(result.outcome.status, NoteWriteStatus::Pending);
    assert_eq!(count(&store, "note_card_bindings"), 0);
    assert_eq!(protected(&store), before);
    assert_eq!(
        serde_json::to_value(store.get_card(&id(101)).unwrap()).unwrap(),
        card
    );
    store
        .conn
        .execute_batch("DROP TRIGGER fail_binding;")
        .unwrap();
    drop(store);
    let mut store = Store::open(directory.path()).unwrap();
    assert_eq!(
        store
            .resume_note_conversion(&id(801))
            .unwrap()
            .outcome
            .status,
        NoteWriteStatus::Committed
    );
    assert_eq!(count(&store, "cards"), 3);
    assert_eq!(protected(&store), before);
}

#[test]
fn applied_conversion_backup_restores_all_snapshots_with_compatible_metadata() {
    let (_directory, mut store) = setup();
    let choice = selection(&store, 2, Some(101));
    let result = apply(&mut store, choice).unwrap();
    let backup = store.create_backup().unwrap();
    let parent = tempfile::tempdir().unwrap();
    let target = parent.path().join("restored");
    store.restore_backup(&backup.id, &target).unwrap();
    let mut restored = Store::open(&target).unwrap();
    assert_eq!(
        restored.note_binding(&id(2)).unwrap().unwrap().card_id,
        result.card_id
    );
    assert_eq!(
        restored
            .note_conversion_details(&id(801))
            .unwrap()
            .before_source,
        store
            .note_conversion_details(&id(801))
            .unwrap()
            .before_source
    );
    assert_eq!(protected(&restored), protected(&store));
    fs::remove_file(target.join("lesson.md")).unwrap();
    assert_eq!(
        restored
            .resume_note_conversion(&id(801))
            .unwrap()
            .outcome
            .status,
        NoteWriteStatus::Committed
    );
}

#[test]
fn linked_conversion_retains_inline_mnemonic_and_never_enables_the_source() {
    let (directory, mut store) = setup();
    let mut choice = selection(&store, 2, Some(101));
    choice["back"] = json!({"kind":"page","pageId":id(4),"face":"front"});
    let target = fs::read(directory.path().join("nguồn.md")).unwrap();
    let before = protected(&store);
    apply(&mut store, choice).unwrap();
    let document = super::note_memory::parse_document(
        &fs::read_to_string(directory.path().join("lesson.md")).unwrap(),
    );
    assert!(document.back.contains("Indented mnemonic"));
    assert_eq!(
        store.read_note_memory(&id(2)).unwrap().state,
        super::note_lifecycle::NoteLearningState::Ready
    );
    assert!(store.note_binding(&id(4)).unwrap().is_none());
    assert_eq!(fs::read(directory.path().join("nguồn.md")).unwrap(), target);
    assert_eq!(protected(&store), before);
}

#[test]
fn pending_conversion_rejects_changed_target_media_card_or_duplicate_identity_before_writing() {
    for changed in ["target", "media", "card", "identity"] {
        let (directory, mut store, before) = pending_dependency(changed);
        change_dependency(changed, directory.path(), &store);
        let expected = protected(&store);
        assert_eq!(
            store
                .resume_note_conversion(&id(801))
                .unwrap()
                .outcome
                .status,
            NoteWriteStatus::Conflict,
            "{changed}"
        );
        assert_eq!(
            fs::read(directory.path().join("lesson.md")).unwrap(),
            before,
            "{changed}"
        );
        assert_eq!(count(&store, "note_card_bindings"), 0);
        assert_eq!(protected(&store), expected);
    }
}

#[test]
fn concurrent_identical_conversion_requests_return_one_card_and_one_backup() {
    let (directory, store) = setup();
    let choice = selection(&store, 2, None);
    drop(store);
    let start = std::sync::Arc::new(std::sync::Barrier::new(2));
    let handles: Vec<_> = (0..2)
        .map(|_| {
            let root = directory.path().to_path_buf();
            let choice = choice.clone();
            let start = start.clone();
            std::thread::spawn(move || {
                let mut store = Store::open(&root).unwrap();
                start.wait();
                apply(&mut store, choice)
            })
        })
        .collect();
    let mut outcomes = Vec::new();
    for handle in handles {
        outcomes.push(handle.join().unwrap().unwrap());
    }
    assert_eq!(outcomes[0].card_id, outcomes[1].card_id);
    let store = Store::open(directory.path()).unwrap();
    assert_eq!(store.list_backups().unwrap().len(), 1);
    assert_eq!(count(&store, "cards"), 4);
    assert_eq!(count(&store, "note_learning_operations"), 1);
}

#[test]
fn pending_conversion_requires_its_verified_backup_and_cannot_be_finished_as_a_raw_save() {
    let (directory, mut store) = setup();
    let choice = selection(&store, 2, Some(101));
    store
        .apply_note_conversion_with_hooks(
            serde_json::from_value(choice).unwrap(),
            &NoteWriteHooks::stop_at(Checkpoint::Prepared),
        )
        .unwrap_err();
    let detail = store.note_conversion_details(&id(801)).unwrap();
    let before = fs::read(directory.path().join("lesson.md")).unwrap();
    let write = super::note_write::NoteWriteRequest {
        operation_id: id(801),
        page_id: id(2),
        expected_hash: super::migration_plan::content_hash(&detail.before_source),
        expected_revision: None,
        source: detail.after_source,
    };
    assert!(store.save_note_memory(write).is_err());
    fs::write(
        directory.path().join(format!(
            ".memnova/backups/{}/files/lesson.md",
            detail.backup_id
        )),
        "corrupt backup",
    )
    .unwrap();
    assert!(store.resume_note_memory(&id(801)).is_err());
    assert_eq!(
        fs::read(directory.path().join("lesson.md")).unwrap(),
        before
    );
    assert_eq!(count(&store, "note_card_bindings"), 0);
}

#[test]
fn m22_fresh_conversion_rejects_corrupt_schedule_fields_without_mutating_user_data() {
    for (field, value) in [
        ("stability", json!(12)),
        ("difficulty", json!(4)),
        ("elapsedDays", json!(3)),
        ("scheduledDays", json!(7)),
        ("lastReview", json!("2026-01-01T00:00:00Z")),
        ("learningSteps", json!(2)),
        ("engine", json!("ts-fsrs@5.4.2")),
        ("due", json!("2999-01-01T00:00:00Z")),
    ] {
        let (directory, mut store) = setup();
        let choice = selection(&store, 2, None);
        store
            .apply_note_conversion_with_hooks(
                serde_json::from_value(choice).unwrap(),
                &NoteWriteHooks::stop_at(Checkpoint::Prepared),
            )
            .unwrap_err();
        let mut payload: serde_json::Value =
            serde_json::to_value(store.load_note_write(&id(801)).unwrap().unwrap()).unwrap();
        payload["conversion"]["schedule"][field] = value;
        let payload = payload.to_string();
        store
            .conn
            .execute(
                "UPDATE note_learning_operations SET payload_json=?1 WHERE id=?2",
                [&payload, &id(801)],
            )
            .unwrap();
        let bytes = fs::read(directory.path().join("lesson.md")).unwrap();
        let before = protected(&store);
        assert!(
            store.resume_note_conversion(&id(801)).is_err(),
            "field {field}"
        );
        assert_eq!(fs::read(directory.path().join("lesson.md")).unwrap(), bytes);
        assert_eq!(protected(&store), before);
        assert_eq!(count(&store, "note_card_bindings"), 0);
        assert_eq!(count(&store, "cards"), 3);
        assert_eq!(
            store
                .conn
                .query_row(
                    "SELECT payload_json FROM note_learning_operations WHERE id=?1",
                    [id(801)],
                    |row| row.get::<_, String>(0)
                )
                .unwrap(),
            payload
        );
    }
}
