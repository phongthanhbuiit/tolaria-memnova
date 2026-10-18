use super::{
    migration_plan::content_hash,
    note_memory_fixture::{fixture, id},
    note_write::{Checkpoint, NoteWriteHooks, NoteWriteRequest},
    Store,
};
use std::fs;

fn pending_fixture() -> (tempfile::TempDir, Store) {
    let (directory, mut store) = fixture();
    store
        .conn
        .execute(
            "UPDATE library_metadata SET value_json='\"ready\"' WHERE key='migrationState'",
            [],
        )
        .unwrap();
    let source = fs::read_to_string(store.root.join("lesson.md")).unwrap();
    let request = NoteWriteRequest {
        operation_id: id(880),
        page_id: id(2),
        expected_hash: content_hash(&source),
        expected_revision: None,
        source: format!("{source}Pending draft\n"),
    };
    assert!(store
        .write_note_source_with_hooks(
            request,
            |_, _| Ok(None),
            &NoteWriteHooks::stop_at(Checkpoint::Prepared)
        )
        .is_err());
    (directory, store)
}

#[test]
fn pending_note_cannot_be_renamed_through_the_public_file_command() {
    let (directory, _store) = pending_fixture();
    let path = directory.path().join("lesson.md");
    let before = fs::read(&path).unwrap();
    let args = serde_json::from_value(serde_json::json!({
        "vaultPath": directory.path(), "oldPath": path,
        "newFilenameStem": "changed"
    }))
    .unwrap();
    let result = crate::commands::rename_note_filename(args);
    assert!(
        result.is_err(),
        "Pending recovery must block rename: {result:?}"
    );
    assert_eq!(fs::read(path).unwrap(), before);
    assert!(!directory.path().join("changed.md").exists());
}

#[tokio::test]
async fn batch_delete_preflights_all_pending_notes_before_removing_any_file() {
    let (directory, _store) = pending_fixture();
    let paths: Vec<String> = ["ordinary.md", "lesson.md"]
        .iter()
        .map(|name| directory.path().join(name).to_string_lossy().into_owned())
        .collect();
    let result = crate::commands::batch_delete_notes_async(
        paths.clone(),
        Some(directory.path().to_string_lossy().into_owned()),
    )
    .await;
    assert!(
        result.is_err(),
        "Pending recovery must block the entire batch: {result:?}"
    );
    assert!(paths.iter().all(|path| std::path::Path::new(path).exists()));
}

#[test]
fn folder_delete_and_rename_preflight_nested_pending_notes() {
    for rename in [false, true] {
        let (directory, mut store) = fixture();
        fs::create_dir(directory.path().join("nested")).unwrap();
        fs::rename(
            directory.path().join("lesson.md"),
            directory.path().join("nested/lesson.md"),
        )
        .unwrap();
        store
            .conn
            .execute(
                "UPDATE library_metadata SET value_json='\"ready\"' WHERE key='migrationState'",
                [],
            )
            .unwrap();
        store.sync_pages().unwrap();
        let source = fs::read_to_string(directory.path().join("nested/lesson.md")).unwrap();
        let request = NoteWriteRequest {
            operation_id: id(880),
            page_id: id(2),
            expected_hash: content_hash(&source),
            expected_revision: None,
            source: format!("{source}Draft"),
        };
        assert!(store
            .write_note_source_with_hooks(
                request,
                |_, _| Ok(None),
                &NoteWriteHooks::stop_at(Checkpoint::Prepared)
            )
            .is_err());
        let vault = directory.path().to_string_lossy().into_owned();
        let result = if rename {
            crate::commands::rename_vault_folder(vault, "nested".into(), "changed".into())
                .map(|_| ())
        } else {
            crate::commands::delete_vault_folder(vault, "nested".into()).map(|_| ())
        };
        assert!(
            result.is_err(),
            "Pending nested recovery must block folder mutation"
        );
        assert_eq!(
            fs::read_to_string(directory.path().join("nested/lesson.md")).unwrap(),
            source
        );
    }
}

#[test]
fn clone_changes_only_its_owned_identity_and_keeps_inline_canvas_and_opaque_yaml() {
    let (directory, store) = fixture();
    store
        .conn
        .execute(
            "UPDATE library_metadata SET value_json='\"ready\"' WHERE key='migrationState'",
            [],
        )
        .unwrap();
    let original = format!("\u{feff}---\r\n# user comment\r\n_memnova_page_id: '{}' # identity\r\nopaque: &keep {{huge: 9007199254740993, empty: null}}\r\nreference: *keep\r\n_memnova_learning_version: 1\r\n_memnova_learning_enabled: true\r\n_memnova_back_kind: inline\r\n---\r\nArticle\r\n<!-- FLASHCARD:BACK -->\r\n```whiteboard\r\n{{\"id\":\"same-board\",\"snapshot\":{{\"store\":{{}}}}}}\r\n```\r\n", id(2));
    let cloned = super::page_content::prepare_create(directory.path(), &original).unwrap();
    let parsed = super::note_memory::parse_document(&cloned);
    let new_id = parsed.page_id.unwrap();
    assert_ne!(new_id, id(2));
    assert_eq!(cloned.replace(&new_id, &id(2)), original);
    assert_eq!(store.get_card(&id(101)).unwrap().schedule.reps, 7);
}

fn enabled_fixture() -> (tempfile::TempDir, Store) {
    let (directory, mut store) = fixture();
    store
        .conn
        .execute(
            "UPDATE library_metadata SET value_json='\"ready\"' WHERE key='migrationState'",
            [],
        )
        .unwrap();
    let path = directory.path().join("ordinary.md");
    let original = fs::read_to_string(&path).unwrap();
    let source = super::note_memory::patch_config(
        &format!("{original}\n<!-- FLASHCARD:BACK -->\n```whiteboard\n{{\"id\":\"board\",\"snapshot\":{{\"store\":{{\"shape:one\":{{\"typeName\":\"shape\",\"type\":\"draw\"}}}}}}}}\n```\n"),
        &super::note_memory::MemoryConfig::inline(true),
    ).unwrap();
    fs::write(path, source).unwrap();
    let binding = store
        .reconcile_note_memory(&id(1))
        .unwrap()
        .binding
        .unwrap();
    store
        .conn
        .execute(
            "UPDATE schedules SET reps=11,stability=12,difficulty=4 WHERE card_id=?1",
            [&binding.card_id],
        )
        .unwrap();
    (directory, store)
}

#[test]
fn public_filename_and_folder_moves_retain_one_bound_identity_and_exact_memory() {
    let (directory, mut store) = enabled_fixture();
    let binding = store.note_binding(&id(1)).unwrap().unwrap();
    let before = store.get_card(&binding.card_id).unwrap().schedule;
    let bytes = fs::read(directory.path().join("ordinary.md")).unwrap();
    let args = serde_json::from_value(serde_json::json!({ "vaultPath": directory.path(), "oldPath": directory.path().join("ordinary.md"), "newFilenameStem": "renamed" })).unwrap();
    let renamed = crate::commands::rename_note_filename(args).unwrap();
    fs::create_dir(directory.path().join("Lessons")).unwrap();
    let args = serde_json::from_value(serde_json::json!({ "vaultPath": directory.path(), "oldPath": renamed.new_path, "folderPath": "Lessons" })).unwrap();
    let moved = crate::commands::move_note_to_folder(args).unwrap();
    store.sync_pages().unwrap();
    let view = store.reconcile_note_memory(&id(1)).unwrap();
    assert_eq!(view.path, "Lessons/renamed.md");
    assert_eq!(view.binding.unwrap().card_id, binding.card_id);
    assert_eq!(store.get_card(&binding.card_id).unwrap().schedule, before);
    assert_eq!(fs::read(moved.new_path).unwrap(), bytes);
}

#[test]
fn copied_note_gets_fresh_binding_and_canvas_edits_cannot_mutate_original() {
    let (directory, mut store) = enabled_fixture();
    let binding = store.note_binding(&id(1)).unwrap().unwrap();
    let schedule = store.get_card(&binding.card_id).unwrap().schedule;
    let original = fs::read_to_string(directory.path().join("ordinary.md")).unwrap();
    crate::commands::create_note_content(
        directory.path().join("copy.md"),
        original.clone(),
        Some(directory.path().to_path_buf()),
    )
    .unwrap();
    store.sync_pages().unwrap();
    let copy_source = fs::read_to_string(directory.path().join("copy.md")).unwrap();
    let copy_id = super::note_memory::parse_document(&copy_source)
        .page_id
        .unwrap();
    let copied = store
        .reconcile_note_memory(&copy_id)
        .unwrap()
        .binding
        .unwrap();
    assert_ne!(copied.card_id, binding.card_id);
    assert_eq!(store.get_card(&copied.card_id).unwrap().schedule.reps, 0);
    fs::write(
        directory.path().join("copy.md"),
        copy_source.replace("shape:one", "shape:changed"),
    )
    .unwrap();
    assert_eq!(
        fs::read_to_string(directory.path().join("ordinary.md")).unwrap(),
        original
    );
    assert_eq!(store.get_card(&binding.card_id).unwrap().schedule, schedule);
    let copied_reviews: u32 = store
        .conn
        .query_row(
            "SELECT count(*) FROM reviews WHERE card_id=?1",
            [copied.card_id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(copied_reviews, 0);
}

#[tokio::test]
async fn deleting_linked_source_invalidates_owner_without_deleting_its_memory_or_inline_backup() {
    let (directory, mut store) = enabled_fixture();
    let path = directory.path().join("ordinary.md");
    let source = fs::read_to_string(&path).unwrap();
    let config = super::note_memory::MemoryConfig {
        version: 1,
        enabled: true,
        back: super::note_memory::MemoryBack::Page {
            page_id: id(4),
            face: super::note_memory::MemoryFace::Front,
        },
    };
    let linked = super::note_memory::patch_config(&source, &config).unwrap();
    fs::write(&path, &linked).unwrap();
    let binding = store
        .reconcile_note_memory(&id(1))
        .unwrap()
        .binding
        .unwrap();
    let before = store.get_card(&binding.card_id).unwrap().schedule;
    let target = directory.path().join("nguồn.md");
    let deleted = crate::commands::batch_delete_notes_async(
        vec![target.to_string_lossy().into_owned()],
        Some(directory.path().to_string_lossy().into_owned()),
    )
    .await
    .unwrap();
    assert_eq!(deleted.len(), 1);
    store.sync_pages().unwrap();
    let state = store.reconcile_note_memory(&id(1)).unwrap();
    assert_eq!(
        state.state,
        super::note_lifecycle::NoteLearningState::Invalid
    );
    assert_eq!(
        store.get_card(&binding.card_id).unwrap().status,
        "suspended"
    );
    assert_eq!(store.get_card(&binding.card_id).unwrap().schedule, before);
    assert_eq!(fs::read_to_string(path).unwrap(), linked);
    assert!(store
        .read_note_face(&id(4), super::note_memory::MemoryFace::Front)
        .is_err());
}

#[test]
fn linked_clone_retains_only_target_identity_and_starts_with_fresh_memory() {
    let (directory, mut store) = enabled_fixture();
    let original = fs::read_to_string(directory.path().join("ordinary.md")).unwrap();
    let config = super::note_memory::MemoryConfig {
        version: 1,
        enabled: true,
        back: super::note_memory::MemoryBack::Page {
            page_id: id(4),
            face: super::note_memory::MemoryFace::Front,
        },
    };
    let source = super::note_memory::patch_config(&original, &config).unwrap();
    let target_before = fs::read(directory.path().join("nguồn.md")).unwrap();
    crate::commands::create_note_content(
        directory.path().join("linked-copy.md"),
        source.clone(),
        Some(directory.path().to_path_buf()),
    )
    .unwrap();
    store.sync_pages().unwrap();
    let copied = fs::read_to_string(directory.path().join("linked-copy.md")).unwrap();
    let document = super::note_memory::parse_document(&copied);
    let copy_id = document.page_id.unwrap();
    assert_ne!(copy_id, id(1));
    assert_eq!(document.config.unwrap(), config);
    assert_eq!(copied.replace(&copy_id, &id(1)), source);
    let view = store.reconcile_note_memory(&copy_id).unwrap();
    assert_eq!(view.state, super::note_lifecycle::NoteLearningState::Ready);
    assert_eq!(view.schedule.unwrap().reps, 0);
    assert_eq!(
        fs::read(directory.path().join("nguồn.md")).unwrap(),
        target_before
    );
    assert!(store.note_binding(&id(4)).unwrap().is_none());
}

#[test]
fn configured_note_cannot_silently_leave_the_library_that_owns_its_schedule() {
    let (directory, store) = enabled_fixture();
    let destination = tempfile::tempdir().unwrap();
    let path = directory.path().join("ordinary.md");
    let bytes = fs::read(&path).unwrap();
    let binding = store.note_binding(&id(1)).unwrap().unwrap();
    let before = store.get_card(&binding.card_id).unwrap().schedule;
    let args = serde_json::from_value(serde_json::json!({
        "sourceVaultPath": directory.path(), "destinationVaultPath": destination.path(),
        "oldPath": path, "replacementTarget": null
    }))
    .unwrap();
    assert!(crate::commands::move_note_to_workspace(args).is_err());
    assert_eq!(fs::read(path).unwrap(), bytes);
    assert!(!destination.path().join("ordinary.md").exists());
    assert_eq!(store.get_card(&binding.card_id).unwrap().schedule, before);
}

#[test]
fn title_rename_of_bom_crlf_note_keeps_both_faces_and_registered_identity() {
    let (directory, mut store) = enabled_fixture();
    let path = directory.path().join("ordinary.md");
    let before = fs::read_to_string(&path).unwrap();
    let source = format!("\u{feff}{}", before.replace('\n', "\r\n"));
    fs::write(&path, &source).unwrap();
    let binding = store.note_binding(&id(1)).unwrap().unwrap();
    let schedule = store.get_card(&binding.card_id).unwrap().schedule;
    let args = serde_json::from_value(serde_json::json!({
        "vaultPath": directory.path(), "oldPath": path, "newTitle": "Renamed article"
    }))
    .unwrap();
    let result = crate::commands::rename_note(args).unwrap();
    let saved = fs::read_to_string(result.new_path).unwrap();
    let document = super::note_memory::parse_document(&saved);
    assert_eq!(document.page_id.as_deref(), Some(id(1).as_str()));
    assert_eq!(
        document.front,
        super::note_memory::parse_document(&source).front
    );
    assert_eq!(
        document.back,
        super::note_memory::parse_document(&source).back
    );
    store.sync_pages().unwrap();
    let view = store.reconcile_note_memory(&id(1)).unwrap();
    assert_eq!(view.state, super::note_lifecycle::NoteLearningState::Ready);
    assert_eq!(view.schedule.unwrap(), schedule);
}

#[tokio::test]
async fn externally_moved_pending_note_is_guarded_by_uuid_but_unrelated_note_can_be_deleted() {
    let (directory, _store) = pending_fixture();
    let root = directory.path().to_string_lossy().into_owned();
    let moved = directory.path().join("external-move.md");
    fs::rename(directory.path().join("lesson.md"), &moved).unwrap();
    let before = fs::read(&moved).unwrap();
    assert!(crate::commands::batch_delete_notes_async(
        vec![moved.to_string_lossy().into_owned()],
        Some(root.clone())
    )
    .await
    .is_err());
    assert_eq!(fs::read(moved).unwrap(), before);
    let ordinary = directory.path().join("ordinary.md");
    assert_eq!(
        crate::commands::batch_delete_notes_async(
            vec![ordinary.to_string_lossy().into_owned()],
            Some(root)
        )
        .await
        .unwrap()
        .len(),
        1
    );
    assert!(!ordinary.exists());
}

#[test]
fn m22_case_and_unicode_alias_renames_keep_bound_identity_and_schedule() {
    let (directory, mut store) = enabled_fixture();
    let binding = store.note_binding(&id(1)).unwrap().unwrap();
    let before = store.get_card(&binding.card_id).unwrap().schedule;
    let bytes = fs::read(directory.path().join("ordinary.md")).unwrap();
    let mut path = directory.path().join("ordinary.md");
    for stem in [
        "Ordinary",
        "mnemonic-nguồn",
        "mnemonic-nguo\u{0302}\u{0300}n",
    ] {
        let args = serde_json::from_value(
            serde_json::json!({"vaultPath":directory.path(),"oldPath":path,"newFilenameStem":stem}),
        )
        .unwrap();
        let result = crate::commands::rename_note_filename(args).unwrap();
        path = std::path::PathBuf::from(result.new_path);
        store.sync_pages().unwrap();
        let view = store.reconcile_note_memory(&id(1)).unwrap();
        assert_eq!(
            view.state,
            super::note_lifecycle::NoteLearningState::Ready,
            "{stem}"
        );
        assert_eq!(view.binding.unwrap().card_id, binding.card_id);
        assert_eq!(store.get_card(&binding.card_id).unwrap().schedule, before);
        assert_eq!(fs::read(&path).unwrap(), bytes);
    }
}
