use super::{
    note_conversion_test_support::{protected, selection, setup},
    note_memory::{patch_config, patch_face, MemoryConfig, MemoryFace},
    note_memory_fixture::id,
    note_write::{Checkpoint, NoteWriteHooks, NoteWriteRequest},
    Store,
};
use serde_json::{json, Value};
use std::fs;

fn pending_save() -> (tempfile::TempDir, Store, NoteWriteRequest) {
    let (directory, mut store) = setup();
    let path = directory.path().join("ordinary.md");
    let before = fs::read_to_string(&path).unwrap();
    let configured = patch_config(&before, &MemoryConfig::inline(true)).unwrap();
    fs::write(
        &path,
        patch_face(&configured, MemoryFace::Back, "Mnemonic\n", true).unwrap(),
    )
    .unwrap();
    let view = store.reconcile_note_memory(&id(1)).unwrap();
    let source = fs::read_to_string(&path).unwrap();
    let request = NoteWriteRequest {
        operation_id: id(850),
        page_id: id(1),
        expected_hash: view.source_hash.unwrap(),
        expected_revision: Some(0),
        source: source.replace("Ordinary note", "Saved draft"),
    };
    store.conn.execute_batch("CREATE TRIGGER interrupt_save BEFORE UPDATE ON note_card_bindings BEGIN SELECT RAISE(ABORT,'test failure'); END;").unwrap();
    assert_eq!(
        serde_json::to_value(store.save_note_memory(request.clone()).unwrap()).unwrap()["status"],
        "pending"
    );
    store
        .conn
        .execute_batch("DROP TRIGGER interrupt_save;")
        .unwrap();
    (directory, store, request)
}
fn keep(store: &mut Store, id: &str, expected: Option<String>) -> Result<Value, String> {
    let request = serde_json::from_value(
        json!({"operationId":id,"expectedCurrentHash":expected,"choice":"keepDisk"}),
    )
    .map_err(|error| error.to_string())?;
    store
        .resolve_note_recovery(request)
        .and_then(|outcome| serde_json::to_value(outcome).map_err(|error| error.to_string()))
}
#[test]
fn keeping_disk_preserves_both_drafts_and_history_and_clears_the_pending_guard_without_a_file_write(
) {
    let (directory, mut store, request) = pending_save();
    let path = directory.path().join("ordinary.md");
    let external = fs::read_to_string(&path)
        .unwrap()
        .replace("Saved draft", "External article");
    fs::write(&path, &external).unwrap();
    let modified = fs::metadata(&path).unwrap().modified().unwrap();
    let binding = store.note_binding(&id(1)).unwrap().unwrap();
    let schedule = store.get_card(&binding.card_id).unwrap().schedule;
    let before = protected(&store);
    let recovery = store.read_note_recovery(&id(850)).unwrap();
    assert_eq!(
        recovery.draft_source.as_deref(),
        Some(request.source.as_str())
    );
    assert_eq!(recovery.current_source.as_deref(), Some(external.as_str()));
    assert_eq!(store.list_note_recovery().unwrap().len(), 1);
    assert_eq!(
        keep(&mut store, &id(850), recovery.current_hash).unwrap()["status"],
        "discarded"
    );
    assert!(store.list_note_recovery().unwrap().is_empty());
    assert_eq!(fs::read_to_string(&path).unwrap(), external);
    assert_eq!(fs::metadata(&path).unwrap().modified().unwrap(), modified);
    assert_eq!(store.get_card(&binding.card_id).unwrap().schedule, schedule);
    assert_eq!(protected(&store), before);
    assert_eq!(
        store
            .read_note_recovery(&id(850))
            .unwrap()
            .draft_source
            .as_deref(),
        Some(request.source.as_str())
    );
    assert_eq!(
        serde_json::to_value(store.save_note_memory(request).unwrap()).unwrap()["status"],
        "discarded"
    );
    store.create_backup().unwrap();
}
#[test]
fn recovery_requires_an_explicit_expected_hash_and_rejects_stale_current_source() {
    let (directory, mut store, _) = pending_save();
    let state = store.read_note_recovery(&id(850)).unwrap();
    let path = directory.path().join("ordinary.md");
    fs::write(&path, "External new bytes").unwrap();
    let before = protected(&store);
    assert!(keep(&mut store, &id(850), state.current_hash).is_err());
    assert_eq!(store.list_note_recovery().unwrap().len(), 1);
    assert_eq!(protected(&store), before);
    assert_eq!(fs::read_to_string(path).unwrap(), "External new bytes");
    assert!(serde_json::from_value::<super::NoteRecoveryRequest>(
        json!({"operationId":id(850),"choice":"keepDisk"})
    )
    .is_err());
}
#[test]
fn resolution_replays_before_reading_a_changed_or_deleted_source_and_never_resumes_the_discarded_write(
) {
    let (directory, mut store, _) = pending_save();
    let state = store.read_note_recovery(&id(850)).unwrap();
    let expected = state.current_hash;
    let outcome = keep(&mut store, &id(850), expected.clone()).unwrap();
    fs::remove_file(directory.path().join("ordinary.md")).unwrap();
    assert_eq!(keep(&mut store, &id(850), expected).unwrap(), outcome);
    assert_eq!(
        serde_json::to_value(store.resume_note_memory(&id(850)).unwrap()).unwrap(),
        outcome
    );
    assert!(!directory.path().join("ordinary.md").exists());
}
#[test]
fn discarding_a_conversion_retains_all_legacy_data_and_both_source_snapshots() {
    let (directory, mut store) = setup();
    let choice = selection(&store, 2, Some(101));
    store
        .apply_note_conversion_with_hooks(
            serde_json::from_value(choice).unwrap(),
            &NoteWriteHooks::stop_at(Checkpoint::Prepared),
        )
        .unwrap_err();
    let detail = store.note_conversion_details(&id(801)).unwrap();
    let before = protected(&store);
    let raw = fs::read_to_string(directory.path().join("lesson.md"))
        .unwrap()
        .replace("Markdown original", "External original");
    fs::write(directory.path().join("lesson.md"), &raw).unwrap();
    let state = store.read_note_recovery(&id(801)).unwrap();
    assert_eq!(
        keep(&mut store, &id(801), state.current_hash).unwrap()["status"],
        "discarded"
    );
    assert!(store.note_binding(&id(2)).unwrap().is_none());
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
    assert_eq!(
        fs::read_to_string(directory.path().join("lesson.md")).unwrap(),
        raw
    );
    let backup = store.create_backup().unwrap();
    let parent = tempfile::tempdir().unwrap();
    let target = parent.path().join("restored");
    store.restore_backup(&backup.id, &target).unwrap();
    let mut restored = Store::open(&target).unwrap();
    assert_eq!(
        serde_json::to_value(restored.resume_note_memory(&id(801)).unwrap()).unwrap()["status"],
        "discarded"
    );
}
#[test]
fn missing_source_can_be_kept_deleted_without_recreating_it_or_losing_the_saved_draft() {
    let (directory, mut store, request) = pending_save();
    let binding = store.note_binding(&id(1)).unwrap().unwrap();
    let schedule = store.get_card(&binding.card_id).unwrap().schedule;
    fs::remove_file(directory.path().join("ordinary.md")).unwrap();
    assert_eq!(
        keep(&mut store, &id(850), None).unwrap()["status"],
        "discarded"
    );
    assert!(!directory.path().join("ordinary.md").exists());
    assert_eq!(
        store.get_card(&binding.card_id).unwrap().status,
        "suspended"
    );
    assert_eq!(store.get_card(&binding.card_id).unwrap().schedule, schedule);
    assert_eq!(
        store
            .read_note_recovery(&id(850))
            .unwrap()
            .draft_source
            .as_deref(),
        Some(request.source.as_str())
    );
}
#[test]
fn committed_writes_cannot_be_reclassified_as_discarded_and_corrupt_journals_are_not_repaired() {
    let (_directory, mut store, _) = pending_save();
    store.resume_note_memory(&id(850)).unwrap();
    let state = store.read_note_recovery(&id(850)).unwrap();
    assert!(keep(&mut store, &id(850), state.current_hash).is_err());
    store.conn.execute("UPDATE note_learning_operations SET payload_json='{\"version\":1,\"opaque\":true}',phase='conflict' WHERE id=?1",[id(850)]).unwrap();
    assert!(store.read_note_recovery(&id(850)).is_err());
    assert!(keep(&mut store, &id(850), None).is_err());
}
