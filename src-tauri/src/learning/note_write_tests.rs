use super::{
    migration_plan::content_hash,
    note_memory_fixture::{fixture, id},
    note_write::{Checkpoint, NoteWriteHooks, NoteWriteRequest, NoteWriteStatus},
    Store,
};
use rusqlite::Transaction;
use std::fs;

fn request(store: &Store) -> NoteWriteRequest {
    let before = fs::read_to_string(store.root.join("lesson.md")).unwrap();
    NoteWriteRequest {
        operation_id: id(801),
        page_id: id(2),
        expected_hash: content_hash(&before),
        expected_revision: None,
        source: before.replace("Indented mnemonic", "Updated mnemonic"),
    }
}

fn complete(
    transaction: &Transaction<'_>,
    _request: &super::note_write::PreparedWrite,
) -> Result<Option<u32>, String> {
    transaction
        .execute(
            "UPDATE cards SET revision=revision+1 WHERE id=?1",
            [id(101)],
        )
        .map_err(|error| error.to_string())?;
    Ok(Some(1))
}

#[test]
fn save_compacts_applied_bytes_and_replays_before_rechecking_changed_source() {
    let (directory, mut store) = fixture();
    let intent = request(&store);
    let original = store.get_card(&id(101)).unwrap();
    let result = store.write_note_source(intent.clone(), complete).unwrap();
    assert_eq!(result.status, NoteWriteStatus::Committed);
    assert_eq!(
        fs::read_to_string(directory.path().join("lesson.md")).unwrap(),
        intent.source
    );
    assert_eq!(store.get_card(&id(101)).unwrap().revision, 1);
    assert_eq!(
        store.get_card(&id(101)).unwrap().schedule,
        original.schedule
    );
    let payload: String = store
        .conn
        .query_row(
            "SELECT payload_json FROM note_learning_operations",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert!(!payload.contains("Updated mnemonic"));
    fs::write(directory.path().join("lesson.md"), "External newer content").unwrap();
    let replay = store.write_note_source(intent.clone(), complete).unwrap();
    assert_eq!(replay, result);
    assert_eq!(store.get_card(&id(101)).unwrap().revision, 1);
    let mut changed = intent;
    changed.source.push_str("Changed intent");
    assert!(store.write_note_source(changed, complete).is_err());
    assert_eq!(
        fs::read_to_string(directory.path().join("lesson.md")).unwrap(),
        "External newer content"
    );
}

#[test]
fn stale_source_or_revision_and_changed_identity_never_overwrite() {
    for mutation in ["source", "revision", "identity"] {
        let (directory, mut store) = fixture();
        let mut intent = request(&store);
        match mutation {
            "source" => {
                fs::write(directory.path().join("lesson.md"), "External edit").unwrap();
            }
            "revision" => {
                intent.expected_revision = Some(42);
            }
            _ => {
                intent.source = intent.source.replace(&id(2), &id(4));
            }
        }
        let bytes = fs::read(directory.path().join("lesson.md")).unwrap();
        assert!(store.write_note_source(intent, complete).is_err());
        assert_eq!(fs::read(directory.path().join("lesson.md")).unwrap(), bytes);
        assert_eq!(store.get_card(&id(101)).unwrap().revision, 0);
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
}

#[test]
fn restart_at_each_checkpoint_completes_exactly_once_and_retains_memory() {
    for checkpoint in [
        Checkpoint::Prepared,
        Checkpoint::Staged,
        Checkpoint::Renamed,
        Checkpoint::FileWritten,
        Checkpoint::Transaction,
        Checkpoint::Applied,
        Checkpoint::Compacted,
    ] {
        let (directory, mut store) = fixture();
        let intent = request(&store);
        let schedule = store.get_card(&id(101)).unwrap().schedule;
        let hooks = NoteWriteHooks::stop_at(checkpoint);
        assert!(store
            .write_note_source_with_hooks(intent.clone(), complete, &hooks)
            .is_err());
        drop(store);
        let mut reopened = Store::open(directory.path()).unwrap();
        let outcome = reopened
            .resume_note_write(&intent.operation_id, complete)
            .unwrap();
        assert_eq!(outcome.status, NoteWriteStatus::Committed, "{checkpoint:?}");
        assert_eq!(
            fs::read_to_string(directory.path().join("lesson.md")).unwrap(),
            intent.source
        );
        assert_eq!(
            reopened.get_card(&id(101)).unwrap().revision,
            1,
            "{checkpoint:?}"
        );
        assert_eq!(reopened.get_card(&id(101)).unwrap().schedule, schedule);
        assert_eq!(
            reopened
                .resume_note_write(&intent.operation_id, complete)
                .unwrap(),
            outcome
        );
        assert_eq!(
            reopened
                .conn
                .query_row("SELECT count(*) FROM reviews", [], |row| row
                    .get::<_, u32>(0))
                .unwrap(),
            2
        );
    }
}

#[test]
fn external_conflict_after_prepare_is_preserved_with_recoverable_intent() {
    let (directory, mut store) = fixture();
    let intent = request(&store);
    assert!(store
        .write_note_source_with_hooks(
            intent.clone(),
            complete,
            &NoteWriteHooks::stop_at(Checkpoint::Prepared)
        )
        .is_err());
    fs::write(
        directory.path().join("lesson.md"),
        "External edit after prepared",
    )
    .unwrap();
    drop(store);
    let mut reopened = Store::open(directory.path()).unwrap();
    let result = reopened
        .resume_note_write(&intent.operation_id, complete)
        .unwrap();
    assert_eq!(result.status, NoteWriteStatus::Conflict);
    assert_eq!(
        fs::read_to_string(directory.path().join("lesson.md")).unwrap(),
        "External edit after prepared"
    );
    let payload: String = reopened
        .conn
        .query_row(
            "SELECT payload_json FROM note_learning_operations",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert!(payload.contains("Updated mnemonic"));
    assert_eq!(reopened.get_card(&id(101)).unwrap().revision, 0);
}

#[test]
fn completion_failure_is_pending_without_a_half_committed_database_update() {
    let (directory, mut store) = fixture();
    let intent = request(&store);
    let outcome = store
        .write_note_source(intent.clone(), |transaction, prepared| {
            complete(transaction, prepared)?;
            Err("Injected SQLite completion failure".into())
        })
        .unwrap();
    assert_eq!(outcome.status, NoteWriteStatus::Pending);
    assert_eq!(
        fs::read_to_string(directory.path().join("lesson.md")).unwrap(),
        intent.source
    );
    assert_eq!(store.get_card(&id(101)).unwrap().revision, 0);
    assert_eq!(
        store
            .resume_note_write(&intent.operation_id, complete)
            .unwrap()
            .status,
        NoteWriteStatus::Committed
    );
}

#[test]
fn another_operation_and_rename_cannot_redirect_an_inflight_save() {
    let (directory, mut store) = fixture();
    let intent = request(&store);
    assert!(store
        .write_note_source_with_hooks(
            intent.clone(),
            complete,
            &NoteWriteHooks::stop_at(Checkpoint::Prepared)
        )
        .is_err());
    let mut another = intent.clone();
    another.operation_id = id(802);
    assert!(store.write_note_source(another, complete).is_err());
    fs::rename(
        directory.path().join("lesson.md"),
        directory.path().join("moved.md"),
    )
    .unwrap();
    store.register_page(&id(2), "moved.md", "Moved").unwrap();
    let bytes = fs::read(directory.path().join("moved.md")).unwrap();
    assert_eq!(
        store
            .resume_note_write(&intent.operation_id, complete)
            .unwrap()
            .status,
        NoteWriteStatus::Conflict
    );
    assert_eq!(fs::read(directory.path().join("moved.md")).unwrap(), bytes);
    assert!(!directory.path().join("lesson.md").exists());
}

#[test]
fn noop_does_not_replace_file_or_increase_revision_and_io_failure_is_pending() {
    let (directory, mut store) = fixture();
    let mut intent = request(&store);
    intent.source = fs::read_to_string(directory.path().join("lesson.md")).unwrap();
    let before = fs::metadata(directory.path().join("lesson.md"))
        .unwrap()
        .modified()
        .unwrap();
    let result = store.write_note_source(intent, |_, _| Ok(None)).unwrap();
    assert_eq!(result.status, NoteWriteStatus::Committed);
    assert_eq!(
        fs::metadata(directory.path().join("lesson.md"))
            .unwrap()
            .modified()
            .unwrap(),
        before
    );
    let mut changed = request(&store);
    changed.operation_id = id(802);
    let outcome = store
        .write_note_source_with_hooks(changed, complete, &NoteWriteHooks::fail_io())
        .unwrap();
    assert_eq!(outcome.status, NoteWriteStatus::Pending);
    assert_eq!(store.get_card(&id(101)).unwrap().revision, 0);
}

#[test]
fn external_change_during_completion_rolls_back_database_and_keeps_the_intent() {
    let (directory, mut store) = fixture();
    let intent = request(&store);
    let path = directory.path().join("lesson.md");
    let result = store
        .write_note_source(intent.clone(), |transaction, prepared| {
            complete(transaction, prepared)?;
            fs::write(&path, "Concurrent external writer").unwrap();
            Ok(Some(1))
        })
        .unwrap();
    assert_eq!(result.status, NoteWriteStatus::Conflict);
    assert_eq!(store.get_card(&id(101)).unwrap().revision, 0);
    assert_eq!(
        fs::read_to_string(path).unwrap(),
        "Concurrent external writer"
    );
    let payload: String = store
        .conn
        .query_row(
            "SELECT payload_json FROM note_learning_operations",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert!(payload.contains("Updated mnemonic"));
}

#[test]
fn missing_pending_source_is_a_conflict_and_never_recreated() {
    let (directory, mut store) = fixture();
    let intent = request(&store);
    assert!(store
        .write_note_source_with_hooks(
            intent.clone(),
            complete,
            &NoteWriteHooks::stop_at(Checkpoint::Prepared)
        )
        .is_err());
    fs::remove_file(directory.path().join("lesson.md")).unwrap();
    let result = store
        .resume_note_write(&intent.operation_id, complete)
        .unwrap();
    assert_eq!(result.status, NoteWriteStatus::Conflict);
    assert!(!directory.path().join("lesson.md").exists());
    assert_eq!(store.get_card(&id(101)).unwrap().revision, 0);
}

fn corrupt_checkpoint(store: &Store, corruption: &str) {
    store
        .conn
        .execute_batch("PRAGMA ignore_check_constraints=ON;")
        .unwrap();
    let raw: String = store
        .conn
        .query_row(
            "SELECT payload_json FROM note_learning_operations",
            [],
            |row| row.get(0),
        )
        .unwrap();
    let mut payload: serde_json::Value = serde_json::from_str(&raw).unwrap();
    match corruption {
        "version" => {
            payload["version"] = 2.into();
        }
        "phase" => {
            store
                .conn
                .execute("UPDATE note_learning_operations SET phase='unknown'", [])
                .unwrap();
        }
        "checksum" => {
            payload["afterHash"] = "a".repeat(64).into();
        }
        "unknown" => {
            payload["unknown"] = true.into();
        }
        "receipt" => {
            store
                .conn
                .execute("UPDATE note_learning_operations SET phase='applied'", [])
                .unwrap();
        }
        _ => {
            payload["afterSource"] = serde_json::Value::Null;
        }
    }
    store
        .conn
        .execute(
            "UPDATE note_learning_operations SET payload_json=?1",
            [payload.to_string()],
        )
        .unwrap();
}

#[test]
fn corrupt_journal_payloads_fail_closed_without_writing_the_source() {
    for corruption in [
        "version", "phase", "checksum", "unknown", "receipt", "bytes",
    ] {
        let (directory, mut store) = fixture();
        let intent = request(&store);
        assert!(store
            .write_note_source_with_hooks(
                intent.clone(),
                complete,
                &NoteWriteHooks::stop_at(Checkpoint::Prepared)
            )
            .is_err());
        corrupt_checkpoint(&store, corruption);
        let bytes = fs::read(directory.path().join("lesson.md")).unwrap();
        assert!(
            store
                .resume_note_write(&intent.operation_id, complete)
                .is_err(),
            "{corruption}"
        );
        assert_eq!(fs::read(directory.path().join("lesson.md")).unwrap(), bytes);
        assert_eq!(store.get_card(&id(101)).unwrap().revision, 0);
    }
}

#[test]
fn concurrent_retries_share_one_durable_receipt_and_one_completion() {
    let (directory, store) = fixture();
    let intent = request(&store);
    drop(store);
    let barrier = std::sync::Arc::new(std::sync::Barrier::new(2));
    let results = std::thread::scope(|scope| {
        let handles: Vec<_> = (0..2)
            .map(|_| {
                let barrier = barrier.clone();
                let intent = intent.clone();
                let root = directory.path();
                scope.spawn(move || {
                    let mut store = Store::open(root).unwrap();
                    barrier.wait();
                    store.write_note_source(intent, complete).unwrap()
                })
            })
            .collect();
        handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .collect::<Vec<_>>()
    });
    assert_eq!(results[0], results[1]);
    let store = Store::open(directory.path()).unwrap();
    assert_eq!(store.get_card(&id(101)).unwrap().revision, 1);
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM note_learning_operations", [], |row| {
                row.get::<_, u32>(0)
            })
            .unwrap(),
        1
    );
}

#[test]
fn source_changed_by_a_failing_completion_is_conflict_not_a_retryable_io_pending() {
    let (directory, mut store) = fixture();
    let intent = request(&store);
    let path = directory.path().join("lesson.md");
    let result = store
        .write_note_source(intent, |_, _| {
            fs::write(&path, "External change found during validation").unwrap();
            Err("Source validation failed".into())
        })
        .unwrap();
    assert_eq!(result.status, NoteWriteStatus::Conflict);
    assert_eq!(store.get_card(&id(101)).unwrap().revision, 0);
    assert_eq!(
        fs::read_to_string(path).unwrap(),
        "External change found during validation"
    );
}

#[test]
fn m22_stale_checkpoint_from_a_second_connection_cannot_replace_a_committed_receipt() {
    for phase in [
        super::NoteOperationPhase::FileWritten,
        super::NoteOperationPhase::Conflict,
    ] {
        let (directory, mut first) = fixture();
        let intent = request(&first);
        first
            .write_note_source_with_hooks(
                intent.clone(),
                complete,
                &NoteWriteHooks::stop_at(Checkpoint::Prepared),
            )
            .unwrap_err();
        let stale = first
            .load_note_write(&intent.operation_id)
            .unwrap()
            .unwrap();
        let mut second = Store::open(directory.path()).unwrap();
        let receipt = second
            .resume_note_write(&intent.operation_id, complete)
            .unwrap();
        let payload: String = second
            .conn
            .query_row(
                "SELECT payload_json FROM note_learning_operations WHERE id=?1",
                [&intent.operation_id],
                |row| row.get(0),
            )
            .unwrap();
        assert!(super::note_write_journal::write_payload(&first.conn, &stale, phase).is_err());
        assert_eq!(
            first
                .load_note_write(&intent.operation_id)
                .unwrap()
                .unwrap()
                .outcome,
            Some(receipt.clone())
        );
        assert_eq!(
            first
                .conn
                .query_row(
                    "SELECT payload_json FROM note_learning_operations WHERE id=?1",
                    [&intent.operation_id],
                    |row| row.get::<_, String>(0)
                )
                .unwrap(),
            payload
        );
        assert_eq!(
            first
                .resume_note_write(&intent.operation_id, complete)
                .unwrap(),
            receipt
        );
        assert_eq!(first.get_card(&id(101)).unwrap().revision, 1);
        assert_eq!(
            fs::read_to_string(directory.path().join("lesson.md")).unwrap(),
            intent.source
        );
    }
}
