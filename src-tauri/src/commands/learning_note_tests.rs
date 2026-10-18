use super::learning::{execute, LearningRequest};
use crate::learning::{MigrationState, Store};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::fs;

fn id(value: u128) -> String {
    uuid::Uuid::from_u128(value).to_string()
}
fn fingerprint(source: &str) -> String {
    format!("{:x}", Sha256::digest(source.as_bytes()))
}
fn fixture() -> (tempfile::TempDir, String) {
    let dir = tempfile::tempdir().unwrap();
    fs::write(dir.path().join("article.md"),format!("---\n_memnova_page_id: {}\ncontext: {{opaque: [false, 9007199254740993]}}\n---\nArticle\n",id(1))).unwrap();
    fs::write(
        dir.path().join("source.md"),
        format!("---\n_memnova_page_id: {}\n---\nSource article\n", id(2)),
    )
    .unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    let preview = crate::learning::preview_migration(dir.path(), None).unwrap();
    store
        .prepare_migration(&preview.fingerprint, None, None)
        .unwrap();
    assert_eq!(
        store.resume_migration(100).unwrap().state,
        MigrationState::Ready
    );
    let library = store.library_id.clone();
    let path = dir.path().join("article.md");
    let source = fs::read_to_string(&path).unwrap();
    fs::write(path, format!("{source}<!-- FLASHCARD:BACK -->\nPicture\n")).unwrap();
    (dir, library)
}
fn call(root: &std::path::Path, library: &str, request: Value) -> Result<Value, String> {
    execute(
        &root.to_string_lossy(),
        Some(library.into()),
        serde_json::from_value::<LearningRequest>(request).map_err(|error| error.to_string())?,
    )
}
fn configuration(root: &std::path::Path) -> Value {
    json!({"kind":"configureNoteMemory","request":{"operationId":id(801),"pageId":id(1),"expectedHash":fingerprint(&fs::read_to_string(root.join("article.md")).unwrap()),"expectedRevision":null,"config":{"version":1,"enabled":true,"back":{"kind":"inline"}}}})
}

#[test]
fn note_ipc_roundtrips_and_configuration_retry_precedes_changed_source_validation() {
    let (dir, library) = fixture();
    let request = configuration(dir.path());
    let result = call(dir.path(), &library, request.clone()).unwrap();
    assert_eq!(result["status"], "committed");
    let state = call(
        dir.path(),
        &library,
        json!({"kind":"readNoteMemory","pageId":id(1)}),
    )
    .unwrap();
    assert_eq!(state["state"], "ready");
    assert!(state["binding"]["cardId"].is_string());
    assert_eq!(state["schedule"]["reps"], 0);
    assert_eq!(state["pendingOperations"], json!([]));
    fs::write(
        dir.path().join("article.md"),
        "External replacement after receipt",
    )
    .unwrap();
    assert_eq!(call(dir.path(), &library, request.clone()).unwrap(), result);
    let mut changed = request;
    changed["request"]["config"]["enabled"] = false.into();
    assert!(call(dir.path(), &library, changed).is_err());
    assert_eq!(
        fs::read_to_string(dir.path().join("article.md")).unwrap(),
        "External replacement after receipt"
    );
}

#[test]
fn note_requests_require_explicit_revision_and_operation_identity_and_reject_unknown_fields() {
    let (dir, library) = fixture();
    let original = configuration(dir.path());
    for field in ["operationId", "expectedRevision", "expectedHash", "pageId"] {
        let mut request = original.clone();
        request["request"].as_object_mut().unwrap().remove(field);
        assert!(
            serde_json::from_value::<LearningRequest>(request).is_err(),
            "{field}"
        );
    }
    for field in ["sql", "path", "libraryRoot"] {
        let mut request = original.clone();
        request["request"][field] = "malicious".into();
        assert!(serde_json::from_value::<LearningRequest>(request).is_err());
    }
    let before = fs::read(dir.path().join("article.md")).unwrap();
    assert!(call(dir.path(), &id(999), original.clone()).is_err());
    let mut stale = original.clone();
    stale["request"]["expectedHash"] = "0".repeat(64).into();
    assert!(call(dir.path(), &library, stale).is_err());
    let mut self_source = original;
    self_source["request"]["config"]["back"] = json!({"kind":"page","pageId":id(1),"face":"front"});
    assert!(call(dir.path(), &library, self_source).is_err());
    assert_eq!(fs::read(dir.path().join("article.md")).unwrap(), before);
    assert!(call(
        dir.path(),
        &library,
        json!({"kind":"readNoteMemory","pageId":id(999)})
    )
    .is_err());
}

#[test]
fn legacy_mutations_cannot_edit_clone_or_list_a_bound_card() {
    let (dir, library) = fixture();
    call(dir.path(), &library, configuration(dir.path())).unwrap();
    let state = call(
        dir.path(),
        &library,
        json!({"kind":"readNoteMemory","pageId":id(1)}),
    )
    .unwrap();
    let card = state["binding"]["cardId"].as_str().unwrap();
    let before = fs::read(dir.path().join("article.md")).unwrap();
    let draft = json!({"front":"Competing SQL editor","back":"Competing answer","answerMode":"inline","status":"active","position":0,"properties":{}});
    let error = call(
        dir.path(),
        &library,
        json!({"kind":"updateCard","cardId":card,"revision":0,"draft":draft}),
    )
    .unwrap_err();
    assert!(error.contains("bound-note-card"));
    assert!(call(
        dir.path(),
        &library,
        json!({"kind":"cloneCard","cardId":card})
    )
    .is_err());
    assert_eq!(
        call(
            dir.path(),
            &library,
            json!({"kind":"listCards","pageId":id(1),"includeTrashed":true})
        )
        .unwrap(),
        json!([])
    );
    assert_eq!(fs::read(dir.path().join("article.md")).unwrap(), before);
}

#[tokio::test]
async fn generic_file_save_cannot_bypass_the_bound_note_coordinator() {
    let (dir, library) = fixture();
    call(dir.path(), &library, configuration(dir.path())).unwrap();
    let path = dir.path().join("article.md");
    let before = fs::read_to_string(&path).unwrap();
    assert!(super::save_note_content(
        path.clone(),
        before.replace("Picture", "Lost to old writer"),
        Some(dir.path().to_path_buf())
    )
    .await
    .is_err());
    assert_eq!(fs::read_to_string(&path).unwrap(), before);
    let moved = dir.path().join("moved.md");
    fs::rename(&path, &moved).unwrap();
    assert!(super::save_note_content(
        moved.clone(),
        before.replace("Picture", "Untracked old writer"),
        Some(dir.path().to_path_buf())
    )
    .await
    .is_err());
    assert_eq!(fs::read_to_string(moved).unwrap(), before);
}

#[test]
fn failed_configuration_completion_is_pending_and_can_resume_without_second_card() {
    let (dir, library) = fixture();
    let conn = rusqlite::Connection::open(dir.path().join(".memnova/learning.sqlite3")).unwrap();
    conn.execute_batch("CREATE TRIGGER fail_binding BEFORE INSERT ON note_card_bindings BEGIN SELECT RAISE(FAIL,'injected completion failure'); END;").unwrap();
    let result = call(dir.path(), &library, configuration(dir.path())).unwrap();
    assert_eq!(result["status"], "pending");
    let state = call(
        dir.path(),
        &library,
        json!({"kind":"readNoteMemory","pageId":id(1)}),
    )
    .unwrap();
    assert_eq!(state["state"], "pending");
    assert_eq!(state["pendingOperations"][0]["operationId"], id(801));
    conn.execute_batch("DROP TRIGGER fail_binding;").unwrap();
    let resumed = call(
        dir.path(),
        &library,
        json!({"kind":"resumeNoteMemory","operationId":id(801)}),
    )
    .unwrap();
    assert_eq!(resumed["status"], "committed");
    assert_eq!(
        call(
            dir.path(),
            &library,
            json!({"kind":"resumeNoteMemory","operationId":id(801)})
        )
        .unwrap(),
        resumed
    );
    assert_eq!(
        conn.query_row("SELECT count(*) FROM note_card_bindings", [], |row| row
            .get::<_, u32>(0))
            .unwrap(),
        1
    );
}

#[test]
fn pending_operations_block_legacy_creates_edits_and_clones_without_a_binding() {
    let (dir, library) = fixture();
    let draft = json!({"front":"Legacy Q","back":"Legacy A","answerMode":"inline","status":"active","position":0,"properties":{}});
    let card = call(
        dir.path(),
        &library,
        json!({"kind":"createCard","pageId":id(2),"draft":draft}),
    )
    .unwrap();
    let conn = rusqlite::Connection::open(dir.path().join(".memnova/learning.sqlite3")).unwrap();
    conn.execute("INSERT INTO note_learning_operations(id,page_id,kind,payload_json,phase,created_at) VALUES(?1,?2,'convert','{\"version\":1}','prepared',1000)",rusqlite::params![id(850),id(2)]).unwrap();
    for request in [
        json!({"kind":"updateCard","cardId":card["id"],"revision":0,"draft":draft}),
        json!({"kind":"cloneCard","cardId":card["id"]}),
        json!({"kind":"createCard","pageId":id(2),"draft":draft}),
    ] {
        assert!(call(dir.path(), &library, request)
            .unwrap_err()
            .contains("pending-note-operation"));
    }
    assert_eq!(
        conn.query_row("SELECT count(*) FROM cards", [], |row| row.get::<_, u32>(0))
            .unwrap(),
        1
    );
}

#[test]
fn conversion_preview_ipc_never_opens_an_uninitialized_store() {
    let dir = tempfile::tempdir().unwrap();
    fs::write(dir.path().join("plain.md"), "Ordinary article\n").unwrap();
    let result = execute(
        &dir.path().to_string_lossy(),
        None,
        serde_json::from_value(json!({"kind":"previewNoteConversion"})).unwrap(),
    )
    .unwrap();
    assert_eq!(result["state"], "importRequired");
    assert!(result["libraryId"].is_null());
    assert!(!dir.path().join(".memnova").exists());
    assert!(serde_json::from_value::<LearningRequest>(
        json!({"kind":"previewNoteConversion","force":true})
    )
    .is_err());
}

#[test]
fn conversion_commands_are_library_bound_and_preserve_compatibility_snapshots() {
    let (dir, library) = fixture();
    let (request, original) = conversion_command_fixture(dir.path(), &library);
    assert!(call(
        dir.path(),
        "foreign",
        json!({"kind":"applyNoteConversion","request":request})
    )
    .is_err());
    let result = call(
        dir.path(),
        &library,
        json!({"kind":"applyNoteConversion","request":request}),
    )
    .unwrap();
    assert_eq!(result["outcome"]["status"], "committed");
    let detail = call(
        dir.path(),
        &library,
        json!({"kind":"noteConversionDetails","operationId":id(802)}),
    )
    .unwrap();
    assert_eq!(
        detail["legacyCards"][0]["card"]["properties"],
        json!({"opaque":[false,null]})
    );
    assert_eq!(
        call(
            dir.path(),
            &library,
            json!({"kind":"noteCompatibility","pageId":id(1)})
        )
        .unwrap(),
        detail
    );
    assert_eq!(
        Store::open(dir.path())
            .unwrap()
            .get_card(&id(101))
            .unwrap()
            .schedule,
        original
    );
    fs::remove_file(dir.path().join("article.md")).unwrap();
    assert_eq!(
        call(
            dir.path(),
            &library,
            json!({"kind":"resumeNoteConversion","operationId":id(802)})
        )
        .unwrap(),
        result
    );
    assert_eq!(
        call(
            dir.path(),
            &library,
            json!({"kind":"applyNoteConversion","request":request})
        )
        .unwrap(),
        result
    );
}

fn conversion_command_fixture(
    root: &std::path::Path,
    library: &str,
) -> (Value, crate::learning::Schedule) {
    let mut store = Store::open(root).unwrap();
    store.create_card_once(&id(101),&id(1),serde_json::from_value(json!({"front":"SQL question","back":"SQL answer","answerMode":"inline","status":"active","position":0,"properties":{"opaque":[false,null]}})).unwrap()).unwrap();
    let original = store.get_card(&id(101)).unwrap().schedule;
    drop(store);
    let preview = call(root, library, json!({"kind":"previewNoteConversion"})).unwrap();
    let page = preview["pages"]
        .as_array()
        .unwrap()
        .iter()
        .find(|page| page["pageId"] == id(1))
        .unwrap();
    let request = json!({"operationId":id(802),"pageId":id(1),"expectedFingerprint":page["fingerprint"],"front":{"kind":"markdown"},"back":{"kind":"inline","source":{"kind":"markdown"}},"memory":{"kind":"reuse","cardId":id(101),"confirmedSameGoal":true}});
    (request, original)
}

#[test]
fn recovery_ipc_keeps_current_source_and_exposes_saved_drafts_after_resolution() {
    let (dir, library) = fixture();
    let (request, _) = conversion_command_fixture(dir.path(), &library);
    let db = rusqlite::Connection::open(dir.path().join(".memnova/learning.sqlite3")).unwrap();
    db.execute_batch("CREATE TRIGGER fail_recovery_fixture BEFORE INSERT ON note_card_bindings BEGIN SELECT RAISE(ABORT,'test interruption'); END;").unwrap();
    assert_eq!(
        call(
            dir.path(),
            &library,
            json!({"kind":"applyNoteConversion","request":request})
        )
        .unwrap()["outcome"]["status"],
        "pending"
    );
    db.execute_batch("DROP TRIGGER fail_recovery_fixture;")
        .unwrap();
    drop(db);
    let path = dir.path().join("article.md");
    let raw = fs::read_to_string(&path)
        .unwrap()
        .replace("Article", "External article");
    fs::write(&path, &raw).unwrap();
    let view = call(
        dir.path(),
        &library,
        json!({"kind":"readNoteRecovery","operationId":id(802)}),
    )
    .unwrap();
    let resolution = json!({"operationId":id(802),"expectedCurrentHash":view["currentHash"],"choice":"keepDisk"});
    assert_eq!(
        call(
            dir.path(),
            &library,
            json!({"kind":"resolveNoteRecovery","request":resolution})
        )
        .unwrap()["status"],
        "discarded"
    );
    assert_eq!(fs::read_to_string(path).unwrap(), raw);
    assert_eq!(
        call(
            dir.path(),
            &library,
            json!({"kind":"listNoteRecovery","includeResolved":false})
        )
        .unwrap(),
        json!([])
    );
    let history = call(
        dir.path(),
        &library,
        json!({"kind":"listNoteRecovery","includeResolved":true}),
    )
    .unwrap();
    assert_eq!(history.as_array().unwrap().len(), 1);
    let recovered = call(
        dir.path(),
        &library,
        json!({"kind":"readNoteRecovery","operationId":id(802)}),
    )
    .unwrap();
    assert_eq!(recovered["draftSource"], view["draftSource"]);
    assert_eq!(recovered["keptSource"], raw);
}
