use super::{
    note_memory::{patch_config, MemoryConfig},
    note_memory_fixture::{fixture, id},
    Store,
};
use crate::{commands, frontmatter::FrontmatterValue};
use std::fs;

fn ready_note(bound: bool) -> (tempfile::TempDir, Store) {
    let (directory, mut store) = fixture();
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
            &MemoryConfig::inline(bound),
        )
        .unwrap(),
    )
    .unwrap();
    if bound {
        store.reconcile_note_memory(&id(1)).unwrap();
    }
    (directory, store)
}

#[test]
fn generic_property_update_and_delete_cannot_be_second_writers_for_configured_notes() {
    for bound in [false, true] {
        let (directory, _store) = ready_note(bound);
        let path = directory.path().join("ordinary.md");
        let before = fs::read(&path).unwrap();
        let root = Some(directory.path().to_string_lossy().into_owned());
        assert!(commands::update_frontmatter(
            path.to_string_lossy().into_owned(),
            "Status".into(),
            FrontmatterValue::String("Done".into()),
            root.clone()
        )
        .is_err());
        assert!(commands::delete_frontmatter_property(
            path.to_string_lossy().into_owned(),
            "context".into(),
            root
        )
        .is_err());
        assert_eq!(fs::read(path).unwrap(), before);
    }
}

#[test]
fn generic_property_namespace_cannot_change_or_delete_system_memory_fields() {
    let (directory, _store) = fixture();
    let path = directory.path().join("ordinary.md");
    let root = Some(directory.path().to_string_lossy().into_owned());
    let before = fs::read(&path).unwrap();
    for key in [
        "_memnova_page_id",
        "_memnova_learning_enabled",
        "_memnova_back_kind",
        " _MEMNOVA_page_id ",
    ] {
        assert!(
            commands::update_frontmatter(
                path.to_string_lossy().into_owned(),
                key.into(),
                FrontmatterValue::String("changed".into()),
                root.clone()
            )
            .is_err(),
            "Reserved field {key}"
        );
        assert!(
            commands::delete_frontmatter_property(
                path.to_string_lossy().into_owned(),
                key.into(),
                root.clone()
            )
            .is_err(),
            "Reserved field {key}"
        );
        assert_eq!(fs::read(&path).unwrap(), before);
    }
}

#[test]
fn bulk_archive_preflights_configured_note_before_writing_any_header() {
    let (directory, _store) = ready_note(true);
    let paths = ["nguồn.md", "ordinary.md"].map(|name| directory.path().join(name));
    let before = paths
        .iter()
        .map(|path| fs::read(path).unwrap())
        .collect::<Vec<_>>();
    let result = commands::batch_archive_notes(
        paths
            .iter()
            .map(|path| path.to_string_lossy().into_owned())
            .collect(),
        Some(directory.path().to_string_lossy().into_owned()),
    );
    assert!(
        result.is_err(),
        "Generic batch must not bypass the note writer"
    );
    for (path, bytes) in paths.iter().zip(before) {
        assert_eq!(fs::read(path).unwrap(), bytes);
    }
}

#[test]
fn native_note_listing_recognizes_properties_in_bom_crlf_header_without_rewriting_bytes() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("note.md");
    let source = "\u{feff}---\r\ntitle: Custom title\r\nStatus: Done\r\ncustom: 0\r\n---\r\nArticle\r\n<!-- FLASHCARD:BACK -->\r\nMnemonic\r\n";
    fs::write(&path, source).unwrap();
    let entry = crate::vault::parse_md_file(&path, None).unwrap();
    assert_eq!(entry.title, "Custom title");
    assert_eq!(entry.status.as_deref(), Some("Done"));
    assert_eq!(entry.properties.get("custom"), Some(&serde_json::json!(0)));
    assert_eq!(fs::read_to_string(path).unwrap(), source);
}

#[test]
fn coordinated_property_change_keeps_schedule_both_faces_and_opaque_yaml() {
    let (directory, mut store) = ready_note(true);
    let path = directory.path().join("ordinary.md");
    let original = fs::read_to_string(&path).unwrap();
    let source = format!(
        "\u{feff}{}",
        original
            .replace(
                "context: {keep: [false, 9007199254740993]}",
                "opaque: &value {huge: 9007199254740993, empty: null}\ncopy: *value"
            )
            .replace('\n', "\r\n")
    );
    fs::write(&path, &source).unwrap();
    let view = store.read_note_memory(&id(1)).unwrap();
    let before = view.schedule.unwrap();
    let changed = crate::frontmatter::update_frontmatter_content(
        &source,
        "Status",
        Some(FrontmatterValue::String("Completed".into())),
    )
    .unwrap();
    let result = store
        .save_note_memory(super::note_write::NoteWriteRequest {
            operation_id: uuid::Uuid::new_v4().to_string(),
            page_id: id(1),
            expected_hash: view.source_hash.unwrap(),
            expected_revision: view.binding.map(|binding| binding.revision),
            source: changed.clone(),
        })
        .unwrap();
    assert_eq!(result.status, super::note_write::NoteWriteStatus::Committed);
    assert_eq!(fs::read_to_string(&path).unwrap(), changed);
    let after = store.read_note_memory(&id(1)).unwrap();
    assert_eq!(after.state, super::note_lifecycle::NoteLearningState::Ready);
    assert_eq!(after.schedule.unwrap(), before);
    assert!(
        changed.contains("opaque: &value {huge: 9007199254740993, empty: null}\r\ncopy: *value")
    );
    let before_faces = super::note_memory::parse_document(&source);
    let after_faces = super::note_memory::parse_document(&changed);
    assert_eq!(after_faces.front, before_faces.front);
    assert_eq!(after_faces.back, before_faces.back);
}

#[test]
fn changing_only_display_hints_never_rewrites_markdown_even_on_retry() {
    let (directory, mut store) = ready_note(true);
    let path = directory.path().join("ordinary.md");
    let source = fs::read(&path).unwrap();
    let modified = fs::metadata(&path).unwrap().modified().unwrap();
    let definitions =
        serde_json::from_value(serde_json::json!({"custom":{"valueKind":"text"}})).unwrap();
    for _ in 0..2 {
        store
            .set_page_property_definitions(&id(1), &Default::default(), &definitions)
            .unwrap();
    }
    assert_eq!(fs::read(&path).unwrap(), source);
    assert_eq!(fs::metadata(path).unwrap().modified().unwrap(), modified);
}
