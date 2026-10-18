use super::{
    note_lifecycle::NoteLearningState,
    note_memory::{patch_config, MemoryBack, MemoryConfig},
    note_memory_fixture::{fixture, id},
    Store,
};
use std::fs;

fn ready_fixture() -> (tempfile::TempDir, Store) {
    let (directory, store) = fixture();
    store
        .conn
        .execute(
            "UPDATE library_metadata SET value_json='\"ready\"' WHERE key='migrationState'",
            [],
        )
        .unwrap();
    (directory, store)
}

fn configure(store: &Store, enabled: bool, back: MemoryBack) {
    let path = store.root.join("ordinary.md");
    let mut source = fs::read_to_string(&path).unwrap();
    if !source.contains("<!-- FLASHCARD:BACK -->") {
        source.push_str("\n<!-- FLASHCARD:BACK -->\nPicture mnemonic\n");
    }
    fs::write(
        path,
        patch_config(
            &source,
            &MemoryConfig {
                version: 1,
                enabled,
                back,
            },
        )
        .unwrap(),
    )
    .unwrap();
}

#[test]
fn ordinary_notes_and_legacy_markers_do_not_create_learning_identities() {
    let (directory, mut store) = ready_fixture();
    for page in [1, 2, 3, 4] {
        let before: String = store.note_write_path(&id(page)).unwrap();
        let path = directory.path().join(before);
        let bytes = fs::read(&path).unwrap();
        let modified = fs::metadata(&path).unwrap().modified().unwrap();
        let state = store.reconcile_note_memory(&id(page)).unwrap();
        assert!(!matches!(
            state.state,
            NoteLearningState::Ready | NoteLearningState::Draft
        ));
        assert!(state.binding.is_none());
        assert_eq!(fs::read(&path).unwrap(), bytes);
        assert_eq!(fs::metadata(path).unwrap().modified().unwrap(), modified);
    }
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM note_learning_operations", [], |row| {
                row.get::<_, u32>(0)
            })
            .unwrap(),
        0
    );
}

#[test]
fn enable_disable_reenable_keeps_one_card_and_exact_memory_and_source_bytes() {
    let (directory, mut store) = ready_fixture();
    configure(&store, true, MemoryBack::Inline);
    let path = directory.path().join("ordinary.md");
    let bytes = fs::read(&path).unwrap();
    let enabled = store.reconcile_note_memory(&id(1)).unwrap();
    assert_eq!(enabled.state, NoteLearningState::Ready);
    let binding = enabled.binding.unwrap();
    let card = store.get_card(&binding.card_id).unwrap();
    assert_eq!(card.status, "active");
    assert!(card.front.is_empty());
    assert!(card.back.is_empty());
    assert_eq!(fs::read(&path).unwrap(), bytes);
    let first_revision = binding.revision;
    assert_eq!(
        store
            .reconcile_note_memory(&id(1))
            .unwrap()
            .binding
            .unwrap()
            .revision,
        first_revision
    );
    configure(&store, false, MemoryBack::Inline);
    let disabled = store.reconcile_note_memory(&id(1)).unwrap();
    assert_eq!(disabled.state, NoteLearningState::Disabled);
    assert_eq!(
        store.get_card(&binding.card_id).unwrap().status,
        "suspended"
    );
    configure(&store, true, MemoryBack::Inline);
    let restored = store
        .reconcile_note_memory(&id(1))
        .unwrap()
        .binding
        .unwrap();
    assert_eq!(restored.card_id, binding.card_id);
    assert_eq!(
        store.get_card(&binding.card_id).unwrap().schedule,
        card.schedule
    );
    assert_eq!(store.list_cards(Some(&id(1)), true).unwrap().len(), 1);
    assert!(fs::read_to_string(path)
        .unwrap()
        .contains("Picture mnemonic"));
}

#[test]
fn blank_invalid_and_empty_canvas_never_activate_and_valid_shapes_do() {
    for (back, expected) in [
        ("", NoteLearningState::Draft),
        ("```tldraw\n{}\n```", NoteLearningState::Draft),
        ("```tldraw\n{broken\n```", NoteLearningState::Invalid),
        (
            "```tldraw\n{\"store\":{\"shape:1\":{\"typeName\":\"shape\",\"type\":\"draw\"}}}\n```",
            NoteLearningState::Ready,
        ),
    ] {
        let (_directory, mut store) = ready_fixture();
        configure(&store, true, MemoryBack::Inline);
        let path = store.root.join("ordinary.md");
        let before = fs::read_to_string(&path).unwrap();
        fs::write(&path, before.replace("Picture mnemonic\n", back)).unwrap();
        let state = store.reconcile_note_memory(&id(1)).unwrap();
        assert_eq!(state.state, expected, "{back}");
        if let Some(binding) = state.binding {
            assert_eq!(
                store.get_card(&binding.card_id).unwrap().status == "active",
                expected == NoteLearningState::Ready
            );
        }
    }
}

#[test]
fn external_corruption_suspends_a_bound_note_without_losing_schedule_or_original_source() {
    let (directory, mut store) = ready_fixture();
    configure(&store, true, MemoryBack::Inline);
    let binding = store
        .reconcile_note_memory(&id(1))
        .unwrap()
        .binding
        .unwrap();
    let before = store.get_card(&binding.card_id).unwrap();
    let path = directory.path().join("ordinary.md");
    let corrupt = fs::read_to_string(&path).unwrap().replace(
        "_memnova_learning_version: 1",
        "_memnova_learning_version: 99",
    );
    fs::write(&path, &corrupt).unwrap();
    let state = store.reconcile_note_memory(&id(1)).unwrap();
    assert_eq!(state.state, NoteLearningState::Invalid);
    let after = store.get_card(&binding.card_id).unwrap();
    assert_eq!(after.status, "suspended");
    assert_eq!(after.schedule, before.schedule);
    assert_eq!(fs::read_to_string(path).unwrap(), corrupt);
}

#[test]
fn existing_legacy_cards_require_explicit_conversion_and_are_never_reused_implicitly() {
    let (_directory, mut store) = ready_fixture();
    let before = store.get_card(&id(101)).unwrap();
    let path = store.root.join("lesson.md");
    let source = fs::read_to_string(&path).unwrap();
    fs::write(
        &path,
        patch_config(
            &source,
            &MemoryConfig {
                version: 1,
                enabled: true,
                back: MemoryBack::Inline,
            },
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        store.reconcile_note_memory(&id(2)).unwrap().state,
        NoteLearningState::ConversionRequired
    );
    assert!(store.note_binding(&id(2)).unwrap().is_none());
    let after = store.get_card(&id(101)).unwrap();
    assert_eq!(after.schedule, before.schedule);
    assert_eq!(after.draft, before.draft);
    assert_eq!(after.revision, before.revision);
}

#[test]
fn linked_source_stays_independent_and_missing_self_or_recursive_back_is_invalid() {
    let (_directory, mut store) = ready_fixture();
    configure(
        &store,
        true,
        MemoryBack::Page {
            page_id: id(4),
            face: super::note_memory::MemoryFace::Front,
        },
    );
    let owner = store.reconcile_note_memory(&id(1)).unwrap();
    assert_eq!(owner.state, NoteLearningState::Ready);
    assert!(store.note_binding(&id(4)).unwrap().is_none());
    for target in [1, 999] {
        configure(
            &store,
            true,
            MemoryBack::Page {
                page_id: id(target),
                face: super::note_memory::MemoryFace::Front,
            },
        );
        assert_eq!(
            store.reconcile_note_memory(&id(1)).unwrap().state,
            NoteLearningState::Invalid
        );
    }
    configure(
        &store,
        true,
        MemoryBack::Page {
            page_id: id(4),
            face: super::note_memory::MemoryFace::Back,
        },
    );
    assert_eq!(
        store.reconcile_note_memory(&id(1)).unwrap().state,
        NoteLearningState::Invalid
    );
}

#[test]
fn missing_database_in_an_initialized_library_never_creates_fresh_history() {
    let (directory, store) = ready_fixture();
    let original = fs::read(directory.path().join("ordinary.md")).unwrap();
    drop(store);
    fs::remove_file(directory.path().join(".memnova/learning.sqlite3")).unwrap();
    assert!(Store::open(directory.path()).is_err());
    assert!(!directory.path().join(".memnova/learning.sqlite3").exists());
    assert_eq!(
        fs::read(directory.path().join("ordinary.md")).unwrap(),
        original
    );
}

#[test]
fn deleted_source_suspends_existing_binding_and_preserves_history() {
    let (directory, mut store) = ready_fixture();
    configure(&store, true, MemoryBack::Inline);
    let binding = store
        .reconcile_note_memory(&id(1))
        .unwrap()
        .binding
        .unwrap();
    let schedule = store.get_card(&binding.card_id).unwrap().schedule;
    fs::remove_file(directory.path().join("ordinary.md")).unwrap();
    let state = store.reconcile_note_memory(&id(1)).unwrap();
    assert_eq!(state.state, NoteLearningState::Invalid);
    assert_eq!(
        store.get_card(&binding.card_id).unwrap().status,
        "suspended"
    );
    assert_eq!(store.get_card(&binding.card_id).unwrap().schedule, schedule);
}

#[test]
fn duplicate_or_changed_page_uuid_never_creates_a_binding() {
    for copied in [false, true] {
        let (directory, mut store) = ready_fixture();
        configure(&store, true, MemoryBack::Inline);
        let path = directory.path().join("ordinary.md");
        let source = fs::read_to_string(&path).unwrap();
        if copied {
            fs::write(directory.path().join("copy.md"), &source).unwrap();
        } else {
            fs::write(&path, source.replace(&id(1), &id(4))).unwrap();
        }
        assert_eq!(
            store.reconcile_note_memory(&id(1)).unwrap().state,
            NoteLearningState::Invalid
        );
        assert!(store.note_binding(&id(1)).unwrap().is_none());
    }
}

#[test]
fn app_save_uses_coordinator_and_preserves_memory_while_updating_document_revision() {
    let (directory, mut store) = ready_fixture();
    configure(&store, true, MemoryBack::Inline);
    let state = store.reconcile_note_memory(&id(1)).unwrap();
    let binding = state.binding.unwrap();
    let schedule = store.get_card(&binding.card_id).unwrap().schedule;
    let source = fs::read_to_string(directory.path().join("ordinary.md"))
        .unwrap()
        .replace("Picture mnemonic", "New picture mnemonic");
    let request = super::note_write::NoteWriteRequest {
        operation_id: id(810),
        page_id: id(1),
        expected_hash: state.source_hash.unwrap(),
        expected_revision: Some(binding.revision),
        source: source.clone(),
    };
    let outcome = store.save_note_memory(request.clone()).unwrap();
    assert_eq!(
        outcome.status,
        super::note_write::NoteWriteStatus::Committed
    );
    assert_eq!(outcome.revision, Some(binding.revision + 1));
    assert_eq!(store.get_card(&binding.card_id).unwrap().schedule, schedule);
    assert_eq!(store.save_note_memory(request).unwrap(), outcome);
    assert_eq!(
        fs::read_to_string(directory.path().join("ordinary.md")).unwrap(),
        source
    );
}

#[test]
fn target_linked_back_is_rejected_but_two_static_front_links_are_not_recursive() {
    let (_directory, mut store) = ready_fixture();
    let target = store.root.join("nguồn.md");
    let source = fs::read_to_string(&target).unwrap();
    fs::write(
        &target,
        patch_config(
            &source,
            &MemoryConfig {
                version: 1,
                enabled: false,
                back: MemoryBack::Page {
                    page_id: id(1),
                    face: super::note_memory::MemoryFace::Front,
                },
            },
        )
        .unwrap(),
    )
    .unwrap();
    configure(
        &store,
        true,
        MemoryBack::Page {
            page_id: id(4),
            face: super::note_memory::MemoryFace::Front,
        },
    );
    assert_eq!(
        store.reconcile_note_memory(&id(1)).unwrap().state,
        NoteLearningState::Ready
    );
    configure(
        &store,
        true,
        MemoryBack::Page {
            page_id: id(4),
            face: super::note_memory::MemoryFace::Back,
        },
    );
    assert_eq!(
        store.reconcile_note_memory(&id(1)).unwrap().state,
        NoteLearningState::Invalid
    );
    assert!(store.note_binding(&id(4)).unwrap().is_none());
}

#[test]
fn empty_database_with_existing_library_identity_is_recovery_not_initialization() {
    let (directory, store) = ready_fixture();
    drop(store);
    let path = directory.path().join(".memnova/learning.sqlite3");
    fs::write(&path, []).unwrap();
    assert!(Store::open(directory.path()).is_err());
    assert!(fs::read(path).unwrap().is_empty());
}

#[test]
fn pending_save_blocks_reconciliation_until_explicit_resume() {
    let (_directory, mut store) = ready_fixture();
    configure(&store, true, MemoryBack::Inline);
    let before = store.reconcile_note_memory(&id(1)).unwrap();
    let binding = before.binding.unwrap();
    let schedule = store.get_card(&binding.card_id).unwrap().schedule;
    let source = fs::read_to_string(store.root.join("ordinary.md"))
        .unwrap()
        .replace("Picture mnemonic", "Newest mnemonic");
    let request = super::note_write::NoteWriteRequest {
        operation_id: id(811),
        page_id: id(1),
        expected_hash: before.source_hash.unwrap(),
        expected_revision: Some(binding.revision),
        source,
    };
    assert!(store
        .write_note_source_with_hooks(
            request,
            |_, _| Ok(None),
            &super::note_write::NoteWriteHooks::stop_at(super::note_write::Checkpoint::Prepared)
        )
        .is_err());
    assert_eq!(
        store.read_note_memory(&id(1)).unwrap().state,
        NoteLearningState::Pending
    );
    assert!(store.reconcile_note_memory(&id(1)).is_err());
    assert_eq!(
        store.resume_note_memory(&id(811)).unwrap().status,
        super::note_write::NoteWriteStatus::Committed
    );
    assert_eq!(store.get_card(&binding.card_id).unwrap().schedule, schedule);
    assert_eq!(
        store.read_note_memory(&id(1)).unwrap().state,
        NoteLearningState::Ready
    );
}

#[test]
fn concurrent_reconciliation_creates_one_binding_and_migration_readiness_is_not_bypassed() {
    let (directory, store) = ready_fixture();
    configure(&store, true, MemoryBack::Inline);
    drop(store);
    let barrier = std::sync::Arc::new(std::sync::Barrier::new(2));
    let bindings = std::thread::scope(|scope| {
        let handles: Vec<_> = (0..2)
            .map(|_| {
                let barrier = barrier.clone();
                let root = directory.path();
                scope.spawn(move || {
                    let mut store = Store::open(root).unwrap();
                    barrier.wait();
                    store
                        .reconcile_note_memory(&id(1))
                        .unwrap()
                        .binding
                        .unwrap()
                })
            })
            .collect();
        handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .collect::<Vec<_>>()
    });
    assert_eq!(bindings[0], bindings[1]);
    let mut store = Store::open(directory.path()).unwrap();
    assert_eq!(store.list_cards(Some(&id(1)), true).unwrap().len(), 1);
    store
        .conn
        .execute(
            "UPDATE library_metadata SET value_json='\"legacy\"' WHERE key='migrationState'",
            [],
        )
        .unwrap();
    assert!(store.reconcile_note_memory(&id(1)).is_err());
    assert_eq!(
        store.migration_state().unwrap(),
        super::MigrationState::Legacy
    );
}

#[test]
fn failed_binding_insert_rolls_back_new_card_schedule_and_receipt_without_rewriting_source() {
    let (directory, mut store) = ready_fixture();
    configure(&store, true, MemoryBack::Inline);
    let path = directory.path().join("ordinary.md");
    let bytes = fs::read(&path).unwrap();
    store.conn.execute_batch("CREATE TRIGGER fail_binding BEFORE INSERT ON note_card_bindings BEGIN SELECT RAISE(FAIL,'injected binding failure'); END;").unwrap();
    assert!(store.reconcile_note_memory(&id(1)).is_err());
    assert!(store.list_cards(Some(&id(1)), true).unwrap().is_empty());
    assert!(store.note_binding(&id(1)).unwrap().is_none());
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM schedules", [], |row| row
                .get::<_, u32>(0))
            .unwrap(),
        3
    );
    assert_eq!(fs::read(path).unwrap(), bytes);
    store
        .conn
        .execute_batch("DROP TRIGGER fail_binding;")
        .unwrap();
    assert_eq!(
        store.reconcile_note_memory(&id(1)).unwrap().state,
        NoteLearningState::Ready
    );
}
