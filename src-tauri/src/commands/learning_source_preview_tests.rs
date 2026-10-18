use super::learning::{execute, LearningRequest};
use crate::learning::Store;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{fs, path::Path};

fn fixture() -> (tempfile::TempDir, String) {
    let dir = tempfile::tempdir().unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    let preview = crate::learning::preview_migration(dir.path(), None).unwrap();
    store
        .prepare_migration(&preview.fingerprint, None, None)
        .unwrap();
    store.resume_migration(100).unwrap();
    let library = store.library_id.clone();
    drop(store);
    fs::write(dir.path().join("source.md"), "\u{feff}---\r\ncustom: &value [9007199254740993, null]\r\ncopy: *value\r\n---\r\nArticle ![memory](attachments/ảnh.svg)\r\n<!-- FLASHCARD:BACK -->\r\n  Retained mnemonic\r\n").unwrap();
    fs::create_dir(dir.path().join("attachments")).unwrap();
    fs::write(
        dir.path().join("attachments/ảnh.svg"),
        "<svg xmlns='http://www.w3.org/2000/svg'/>",
    )
    .unwrap();
    (dir, library)
}
fn call(root: &Path, library: &str, request: Value) -> Result<Value, String> {
    execute(
        &root.to_string_lossy(),
        Some(library.into()),
        serde_json::from_value::<LearningRequest>(request).map_err(|e| e.to_string())?,
    )
}
fn read(root: &Path, library: &str, path: &str, face: &str) -> Result<Value, String> {
    call(
        root,
        library,
        json!({"kind":"previewNoteSource","path":path,"face":face}),
    )
}
fn manifest(root: &Path) -> Vec<(String, Vec<u8>, std::time::SystemTime)> {
    let mut files = walkdir::WalkDir::new(root)
        .into_iter()
        .map(Result::unwrap)
        .filter(|e| e.file_type().is_file())
        .map(|entry| {
            (
                entry
                    .path()
                    .strip_prefix(root)
                    .unwrap()
                    .to_string_lossy()
                    .into_owned(),
                fs::read(entry.path()).unwrap(),
                fs::metadata(entry.path()).unwrap().modified().unwrap(),
            )
        })
        .collect::<Vec<_>>();
    files.sort_by(|a, b| a.0.cmp(&b.0));
    files
}

#[test]
fn source_preview_preserves_every_original_file_and_database_byte_without_registering_identity() {
    let (dir, library) = fixture();
    let before = manifest(dir.path());
    let front = read(dir.path(), &library, "source.md", "front").unwrap();
    assert!(front["pageId"].is_null());
    assert_eq!(front["hasBack"], true);
    assert_eq!(front["backLinked"], false);
    assert_eq!(
        front["content"],
        "Article ![memory](attachments/ảnh.svg)\r\n"
    );
    assert_eq!(front["media"][0]["path"], "attachments/ảnh.svg");
    assert_eq!(
        read(dir.path(), &library, "source.md", "back").unwrap()["content"],
        "  Retained mnemonic\r\n"
    );
    assert_eq!(manifest(dir.path()), before);
}

#[test]
fn source_preview_fingerprints_selected_media_and_never_follows_another_back_link() {
    let (dir, library) = fixture();
    let first = read(dir.path(), &library, "source.md", "front").unwrap();
    fs::write(
        dir.path().join("attachments/ảnh.svg"),
        "<svg xmlns='http://www.w3.org/2000/svg'><circle r='2'/></svg>",
    )
    .unwrap();
    let changed = read(dir.path(), &library, "source.md", "front").unwrap();
    assert_eq!(first["sourceHash"], changed["sourceHash"]);
    assert_ne!(first["fingerprint"], changed["fingerprint"]);
    fs::write(dir.path().join("linked.md"), "---\n_memnova_learning_version: 1\n_memnova_learning_enabled: false\n_memnova_back_kind: page\n_memnova_back_page_id: 22222222-2222-4222-8222-222222222222\n_memnova_back_face: front\n---\nStatic article\n<!-- FLASHCARD:BACK -->\nDo not use this retained back\n").unwrap();
    assert_eq!(
        read(dir.path(), &library, "linked.md", "front").unwrap()["content"],
        "Static article\n"
    );
    assert!(read(dir.path(), &library, "linked.md", "back")
        .unwrap_err()
        .contains("recursive-back-source"));
    fs::write(dir.path().join("plain.md"), "Plain source").unwrap();
    assert!(read(dir.path(), &library, "plain.md", "back")
        .unwrap_err()
        .contains("missing-source-back"));
}

#[test]
fn source_preview_is_library_bound_and_rejects_private_or_escaping_paths_without_writes() {
    let (dir, library) = fixture();
    read(dir.path(), &library, "source.md", "front").unwrap();
    let before = manifest(dir.path());
    for relative in [
        "../outside.md",
        ".memnova/library.json",
        "source.txt",
        "missing.md",
    ] {
        assert!(read(dir.path(), &library, relative, "front").is_err());
    }
    assert!(read(
        dir.path(),
        "11111111-1111-4111-8111-111111111111",
        "source.md",
        "front"
    )
    .is_err());
    assert_eq!(manifest(dir.path()), before);
}

#[test]
fn explicit_source_registration_keeps_content_properties_and_preview_identity_without_enabling_learning(
) {
    let (dir, library) = fixture();
    let original = fs::read_to_string(dir.path().join("source.md")).unwrap();
    let before = read(dir.path(), &library, "source.md", "front").unwrap();
    let page = call(
        dir.path(),
        &library,
        json!({"kind":"ensurePage","path":"source.md","expectedHash":before["sourceHash"]}),
    )
    .unwrap();
    let after = read(dir.path(), &library, "source.md", "front").unwrap();
    assert_eq!(after["pageId"], page["id"]);
    assert_eq!(after["fingerprint"], before["fingerprint"]);
    assert_eq!(after["content"], before["content"]);
    assert_ne!(after["sourceHash"], before["sourceHash"]);
    let updated = fs::read_to_string(dir.path().join("source.md")).unwrap();
    let identity = format!("_memnova_page_id: {}\r\n", page["id"].as_str().unwrap());
    assert_eq!(updated.replace(&identity, ""), original);
    let store = Store::open(dir.path()).unwrap();
    assert!(!store.list_backups().unwrap().is_empty());
    assert!(store.list_cards(None, true).unwrap().is_empty());
    assert!(store
        .read_note_memory(page["id"].as_str().unwrap())
        .unwrap()
        .binding
        .is_none());
}

#[test]
fn guarded_source_registration_rejects_a_stale_preview_before_backup_or_page_changes() {
    let (dir, library) = fixture();
    let source = fs::read_to_string(dir.path().join("source.md")).unwrap();
    let hash = format!("{:x}", Sha256::digest(source.as_bytes()));
    let store = Store::open(dir.path()).unwrap();
    let pages = serde_json::to_value(store.list_pages().unwrap()).unwrap();
    let backups = serde_json::to_value(store.list_backups().unwrap()).unwrap();
    fs::write(
        dir.path().join("source.md"),
        format!("{source}External edit"),
    )
    .unwrap();
    let error = call(
        dir.path(),
        &library,
        json!({"kind":"ensurePage","path":"source.md","expectedHash":hash}),
    )
    .unwrap_err();
    assert!(error.contains("source"), "{error}");
    assert_eq!(
        serde_json::to_value(store.list_pages().unwrap()).unwrap(),
        pages
    );
    assert_eq!(
        serde_json::to_value(store.list_backups().unwrap()).unwrap(),
        backups
    );
    assert_eq!(
        fs::read_to_string(dir.path().join("source.md")).unwrap(),
        format!("{source}External edit")
    );
}
