use super::{
    note_lifecycle::NoteLearningState,
    note_memory::{patch_config, MemoryConfig},
    note_memory_fixture::{fixture, id},
    Store,
};
use std::fs;

fn workspace() -> (tempfile::TempDir, Store) {
    let (directory, store) = fixture();
    store
        .conn
        .execute(
            "UPDATE library_metadata SET value_json='\"ready\"' WHERE key='migrationState'",
            [],
        )
        .unwrap();
    let path = directory.path().join("ordinary.md");
    let source = fs::read_to_string(&path).unwrap();
    fs::write(
        path,
        patch_config(
            &format!("{source}\n<!-- FLASHCARD:BACK -->\nMnemonic\n"),
            &MemoryConfig::inline(true),
        )
        .unwrap(),
    )
    .unwrap();
    for (page, name, metadata) in [
        (5, "disabled.md", "_memnova_learning_version: 1\n_memnova_learning_enabled: false\n_memnova_back_kind: inline\n"),
        (6, "invalid.md", "_memnova_learning_version: 2\n_memnova_learning_enabled: true\n_memnova_back_kind: inline\n"),
    ] {
        fs::write(directory.path().join(name), format!("---\n_memnova_page_id: {}\n{metadata}---\nArticle\n<!-- FLASHCARD:BACK -->\nMnemonic\n", id(page))).unwrap();
    }
    fs::write(
        directory.path().join("unregistered.md"),
        "# A plain note\nNo automatic registration.\n",
    )
    .unwrap();
    (directory, store)
}

#[test]
fn workspace_sync_binds_only_explicit_notes_and_preserves_source_bytes_old_cards_and_repeated_reads(
) {
    let (directory, mut store) = workspace();
    let before = fs::read_dir(directory.path())
        .unwrap()
        .filter_map(|entry| {
            let path = entry.unwrap().path();
            path.is_file().then(|| {
                (
                    path.clone(),
                    fs::read(&path).unwrap(),
                    fs::metadata(&path).unwrap().modified().unwrap(),
                )
            })
        })
        .collect::<Vec<_>>();
    let old = store.get_card(&id(101)).unwrap().schedule;
    let snapshot = store.sync_note_workspace().unwrap();
    let active = snapshot
        .notes
        .iter()
        .find(|note| note.view.page_id == id(1))
        .unwrap();
    assert_eq!(active.view.state, NoteLearningState::Ready);
    let fresh = active.card.as_ref().unwrap().id.clone();
    assert_eq!(
        snapshot
            .notes
            .iter()
            .find(|note| note.view.page_id == id(5))
            .unwrap()
            .view
            .state,
        NoteLearningState::Disabled
    );
    assert!(snapshot
        .notes
        .iter()
        .find(|note| note.view.page_id == id(5))
        .unwrap()
        .card
        .is_none());
    assert_eq!(
        snapshot
            .notes
            .iter()
            .find(|note| note.view.page_id == id(6))
            .unwrap()
            .view
            .state,
        NoteLearningState::Invalid
    );
    assert!(snapshot
        .notes
        .iter()
        .find(|note| note.view.page_id == id(6))
        .unwrap()
        .card
        .is_none());
    assert!(snapshot
        .pages
        .iter()
        .all(|page| page.path != "unregistered.md"));
    let operations: u32 = store
        .conn
        .query_row("SELECT count(*) FROM note_learning_operations", [], |row| {
            row.get(0)
        })
        .unwrap();
    let again = store.sync_note_workspace().unwrap();
    assert_eq!(
        again
            .notes
            .iter()
            .find(|note| note.view.page_id == id(1))
            .unwrap()
            .card
            .as_ref()
            .unwrap()
            .id,
        fresh
    );
    assert_eq!(store.get_card(&id(101)).unwrap().schedule, old);
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM note_card_bindings", [], |row| row
                .get::<_, u32>(0))
            .unwrap(),
        1
    );
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM note_learning_operations", [], |row| {
                row.get::<_, u32>(0)
            })
            .unwrap(),
        operations
    );
    for (path, bytes, modified) in before {
        assert_eq!(fs::read(&path).unwrap(), bytes);
        assert_eq!(fs::metadata(path).unwrap().modified().unwrap(), modified);
    }
}

#[test]
fn workspace_sync_isolates_duplicate_ids_instead_of_disabling_unrelated_learning() {
    let (directory, mut store) = workspace();
    store.sync_note_workspace().unwrap();
    fs::copy(
        directory.path().join("nguồn.md"),
        directory.path().join("source-copy.md"),
    )
    .unwrap();
    let snapshot = store.sync_note_workspace().unwrap();
    assert_eq!(
        snapshot
            .notes
            .iter()
            .find(|note| note.view.page_id == id(1))
            .unwrap()
            .view
            .state,
        NoteLearningState::Ready
    );
    assert_eq!(
        snapshot
            .notes
            .iter()
            .find(|note| note.view.page_id == id(4))
            .unwrap()
            .view
            .state,
        NoteLearningState::Invalid
    );
    assert!(
        !snapshot
            .pages
            .iter()
            .find(|page| page.id == id(4))
            .unwrap()
            .available
    );
}

#[test]
fn pending_note_stays_recoverable_while_a_new_note_session_uses_other_ready_notes() {
    let (directory, mut store) = workspace();
    let other = directory.path().join("nguồn.md");
    let source = fs::read_to_string(&other).unwrap();
    fs::write(
        other,
        patch_config(
            &format!("{source}\n<!-- FLASHCARD:BACK -->\nAnother mnemonic\n"),
            &MemoryConfig::inline(true),
        )
        .unwrap(),
    )
    .unwrap();
    store.sync_note_workspace().unwrap();
    let view = store.read_note_memory(&id(1)).unwrap();
    let path = directory.path().join("ordinary.md");
    let source = fs::read_to_string(&path).unwrap();
    store
        .prepare_note_write(
            super::note_write::NoteWriteRequest {
                operation_id: uuid::Uuid::new_v4().to_string(),
                page_id: id(1),
                expected_hash: view.source_hash.unwrap(),
                expected_revision: view.binding.map(|binding| binding.revision),
                source: format!("{source}\nRetained pending draft\n"),
            },
            None,
            None,
        )
        .unwrap();
    let snapshot = store.sync_note_workspace().unwrap();
    assert_eq!(
        snapshot
            .notes
            .iter()
            .find(|note| note.view.page_id == id(1))
            .unwrap()
            .view
            .state,
        NoteLearningState::Pending
    );
    assert_eq!(fs::read_to_string(path).unwrap(), source);
    let scope = serde_json::from_value(serde_json::json!({"lane":"notes","pageIds":null})).unwrap();
    let session = store.start_session(scope).unwrap();
    assert_eq!(session.initial_count, 1);
    assert_eq!(session.current.unwrap().card.page_id, id(4));
}

#[test]
fn retained_legacy_reviews_without_receipts_do_not_block_a_new_session_or_allow_undo() {
    let (_directory, mut store) = workspace();
    store.sync_note_workspace().unwrap();
    let old = store.get_card(&id(101)).unwrap().schedule;
    let scope = serde_json::from_value(serde_json::json!({"lane":"notes","pageIds":null})).unwrap();
    let session = store.start_session(scope).unwrap();
    assert_eq!(session.initial_count, 1);
    assert!(!session.can_undo);
    assert_eq!(session.review_count, 0);
    assert_eq!(store.get_card(&id(101)).unwrap().schedule, old);
    assert_eq!(
        store
            .conn
            .query_row(
                "SELECT count(*) FROM reviews WHERE after_json IS NULL",
                [],
                |row| row.get::<_, u32>(0)
            )
            .unwrap(),
        2
    );
}
