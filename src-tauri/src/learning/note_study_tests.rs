use super::{
    note_memory::{patch_config, MemoryBack, MemoryConfig, MemoryFace},
    note_memory_fixture::id,
    NoteConfigureRequest, SessionScope, Store, StudySession,
};
use std::fs;

fn fixture() -> (tempfile::TempDir, Store) {
    let dir = tempfile::tempdir().unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    for (page, path, body) in [
        (
            1,
            "article.md",
            "Article\n<!-- FLASHCARD:BACK -->\nMnemonic\n",
        ),
        (
            2,
            "source.md",
            "Reference article\n<!-- FLASHCARD:BACK -->\nHidden source mnemonic\n",
        ),
        (3, "ordinary.md", "Ordinary [[article]]\n"),
    ] {
        let mut source=format!("---\n_memnova_page_id: {}\ncustom: &data {{keep: [false, null, 9007199254740993]}}\ncopy: *data\n---\n{body}",id(page));
        if page == 1 {
            source = patch_config(&source, &MemoryConfig::inline(true)).unwrap();
        }
        fs::write(dir.path().join(path), source).unwrap();
        store.register_page(&id(page), path, path).unwrap();
    }
    store
        .conn
        .execute(
            "UPDATE library_metadata SET value_json='\"ready\"' WHERE key='migrationState'",
            [],
        )
        .unwrap();
    store.reconcile_note_memory(&id(1)).unwrap();
    (dir, store)
}
fn session(store: &mut Store) -> StudySession {
    store
        .start_session(SessionScope {
            lane: Some(super::StudyLane::Notes),
            page_ids: Some(vec![id(1)]),
        })
        .unwrap()
}
fn link(store: &mut Store, back: MemoryBack) {
    let state = store.read_note_memory(&id(1)).unwrap();
    store
        .configure_note_memory(NoteConfigureRequest {
            operation_id: uuid::Uuid::new_v4().to_string(),
            page_id: id(1),
            expected_hash: state.source_hash.unwrap(),
            expected_revision: state.binding.map(|binding| binding.revision),
            config: MemoryConfig {
                version: 1,
                enabled: true,
                back,
            },
        })
        .unwrap();
}

#[test]
fn note_snapshot_uses_live_faces_and_note_properties_instead_of_sql_compatibility_content() {
    let (_dir, mut store) = fixture();
    let card = store.note_binding(&id(1)).unwrap().unwrap().card_id;
    store.conn.execute("UPDATE cards SET front='stale SQL question',back='stale SQL answer',answer_mode='page',answer_page_id=?1,properties_json='{\"image\":\"/outside/unused.png\"}' WHERE id=?2",rusqlite::params![id(3),card]).unwrap();
    let result = session(&mut store);
    let item = result.current.unwrap();
    assert_eq!(item.page.unwrap().content, "Article\n");
    assert_eq!(item.answer_page.unwrap().content, "Mnemonic\n");
    assert!(item.source_error.is_none());
    let content = serde_json::to_value(item.content).unwrap();
    assert_eq!(content["kind"], "note");
    assert!(content["details"]["propertiesRaw"]
        .as_str()
        .unwrap()
        .contains("copy: *data"));
    assert!(!content["details"]["propertiesRaw"]
        .as_str()
        .unwrap()
        .contains("outside/unused"));
    assert_eq!(content["details"]["backSource"]["face"], "back");
}

#[test]
fn linked_target_is_one_selected_face_and_its_schedule_is_independent() {
    let (dir, mut store) = fixture();
    let target = dir.path().join("source.md");
    let source = fs::read_to_string(&target).unwrap();
    fs::write(
        &target,
        patch_config(&source, &MemoryConfig::inline(true)).unwrap(),
    )
    .unwrap();
    let target_card = store
        .reconcile_note_memory(&id(2))
        .unwrap()
        .binding
        .unwrap()
        .card_id;
    let before = store.get_card(&target_card).unwrap().schedule;
    link(
        &mut store,
        MemoryBack::Page {
            page_id: id(2),
            face: MemoryFace::Front,
        },
    );
    let result = session(&mut store);
    assert_eq!(result.initial_count, 1);
    let item = result.current.as_ref().unwrap();
    assert_eq!(
        item.answer_page.as_ref().unwrap().content,
        "Reference article\n"
    );
    assert_eq!(item.answer_page.as_ref().unwrap().id, id(2));
    let review = super::session_tests::request(&result, 3, false);
    store.rate_card(review).unwrap();
    assert_eq!(store.get_card(&target_card).unwrap().schedule, before);
    assert_eq!(
        store
            .conn
            .query_row(
                "SELECT count(*) FROM reviews WHERE card_id=?1",
                [target_card],
                |row| row.get::<_, u32>(0)
            )
            .unwrap(),
        0
    );
}

#[test]
fn owner_target_media_and_path_changes_reject_old_grades_without_touching_memory() {
    for changed in ["owner", "target", "media", "move"] {
        let (dir, mut store) = fixture();
        fs::create_dir(dir.path().join("attachments")).unwrap();
        fs::write(
            dir.path().join("attachments/ảnh.png"),
            b"first synthetic media bytes",
        )
        .unwrap();
        let target = dir.path().join("source.md");
        let source = fs::read_to_string(&target).unwrap().replace(
            "Reference article\n",
            "Reference article ![hint](attachments/ảnh.png)\n",
        );
        fs::write(&target, &source).unwrap();
        link(
            &mut store,
            MemoryBack::Page {
                page_id: id(2),
                face: MemoryFace::Front,
            },
        );
        let result = session(&mut store);
        let review = super::session_tests::request(&result, 3, false);
        let before = store.get_card(&review.card_id).unwrap().schedule;
        change_source(changed, dir.path(), &mut store, &source);
        assert!(store.rate_card(review.clone()).is_err(), "{changed}");
        assert_eq!(store.get_card(&review.card_id).unwrap().schedule, before);
        assert_eq!(
            store
                .conn
                .query_row("SELECT count(*) FROM reviews", [], |row| row
                    .get::<_, u32>(0))
                .unwrap(),
            0
        );
    }
}

#[test]
fn missing_recursive_and_duplicate_sources_never_fall_back_to_sql_or_retained_inline_back() {
    for issue in ["missing", "recursive", "duplicate", "disabled"] {
        let (dir, mut store) = fixture();
        link(
            &mut store,
            MemoryBack::Page {
                page_id: id(2),
                face: MemoryFace::Front,
            },
        );
        break_source(issue, dir.path());
        let result = session(&mut store);
        let item = result.current.unwrap();
        assert!(item.source_error.is_some(), "{issue}");
        assert_eq!(serde_json::to_value(item.content).unwrap()["kind"], "note");
        assert!(item.answer_page.is_none());
    }
}

#[test]
fn committed_review_replays_before_source_or_pending_validation_and_undone_receipt_cannot_replay() {
    let (dir, mut store) = fixture();
    let result = session(&mut store);
    let review = super::session_tests::request(&result, 3, false);
    let saved = store.rate_card(review.clone()).unwrap();
    fs::remove_file(dir.path().join("article.md")).unwrap();
    store.conn.execute("INSERT INTO note_learning_operations(id,page_id,kind,payload_json,phase,created_at) VALUES(?1,?2,'convert','{\"version\":1}','prepared',1000)",rusqlite::params![id(901),id(1)]).unwrap();
    let replay = store.rate_card(review.clone()).unwrap();
    assert!(replay.replayed);
    assert_eq!(replay.earned_xp, saved.earned_xp);
    store
        .undo_review(
            &saved.session.id,
            &review.review_id,
            replay.session.revision,
        )
        .unwrap();
    assert!(store.rate_card(review).is_err());
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM reviews", [], |row| row
                .get::<_, u32>(0))
            .unwrap(),
        1
    );
}

#[test]
fn previewing_a_face_and_following_static_front_cycles_never_creates_reviews_or_sessions() {
    let (dir, mut store) = fixture();
    let target = dir.path().join("source.md");
    write_config(
        &target,
        MemoryConfig {
            version: 1,
            enabled: false,
            back: MemoryBack::Page {
                page_id: id(1),
                face: MemoryFace::Front,
            },
        },
    );
    link(
        &mut store,
        MemoryBack::Page {
            page_id: id(2),
            face: MemoryFace::Front,
        },
    );
    let bytes = fs::read(&target).unwrap();
    assert_eq!(
        store
            .read_note_face(&id(2), MemoryFace::Front)
            .unwrap()
            .content,
        "Reference article\n"
    );
    assert!(store.read_note_face(&id(2), MemoryFace::Back).is_err());
    assert_eq!(fs::read(target).unwrap(), bytes);
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM sessions", [], |row| row
                .get::<_, u32>(0))
            .unwrap(),
        0
    );
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM reviews", [], |row| row
                .get::<_, u32>(0))
            .unwrap(),
        0
    );
    assert!(session(&mut store).current.unwrap().source_error.is_none());
    assert_eq!(
        store
            .start_session(SessionScope {
                lane: Some(super::StudyLane::Notes),
                page_ids: Some(vec![])
            })
            .unwrap()
            .initial_count,
        0
    );
}

#[test]
fn ordinary_wikilinks_and_literal_image_examples_do_not_expand_media_or_study_scope() {
    let (dir, mut store) = fixture();
    let path = dir.path().join("article.md");
    let source=fs::read_to_string(&path).unwrap().replace("Article\n","Article [[unknown]] [note](missing.md) `![literal](missing.png)`\n````md\n![literal](missing.png)\n````\n");
    fs::write(path, source).unwrap();
    let result = session(&mut store);
    assert_eq!(result.initial_count, 1);
    assert!(result.current.unwrap().source_error.is_none());
}

fn legacy_card(store: &mut Store, page: &str, answer: Option<String>) -> super::Card {
    store
        .create_card(
            page,
            super::CardDraft {
                front: "Legacy question".into(),
                back: "Legacy answer".into(),
                answer_mode: if answer.is_some() { "page" } else { "inline" }.into(),
                answer_page_id: answer,
                status: "active".into(),
                position: 0,
                properties: serde_json::json!({}),
                property_definitions: None,
            },
        )
        .unwrap()
}
#[test]
fn legacy_missing_answer_keeps_owner_context_and_pending_legacy_review_is_rejected() {
    let (dir, mut store) = fixture();
    let card = legacy_card(&mut store, &id(3), Some(id(2)));
    fs::remove_file(dir.path().join("source.md")).unwrap();
    let result = store
        .start_session(SessionScope {
            lane: None,
            page_ids: Some(vec![id(3)]),
        })
        .unwrap();
    let item = result.current.as_ref().unwrap();
    assert!(item.page.is_some());
    assert!(item.answer_page.is_none());
    assert!(item.source_error.is_some());
    assert_eq!(
        serde_json::to_value(&item.content).unwrap()["kind"],
        "legacy"
    );
    fs::write(
        dir.path().join("source.md"),
        format!("---\n_memnova_page_id: {}\n---\nRestored reference", id(2)),
    )
    .unwrap();
    let result = store.get_session(&result.id).unwrap();
    let review = super::session_tests::request(&result, 3, false);
    store.conn.execute("INSERT INTO note_learning_operations(id,page_id,kind,payload_json,phase,created_at) VALUES(?1,?2,'convert','{\"version\":1}','prepared',1000)",rusqlite::params![id(990),id(3)]).unwrap();
    assert!(store
        .rate_card(review)
        .unwrap_err()
        .contains("pending-note-operation"));
    assert_eq!(store.get_card(&card.id).unwrap().schedule.reps, 0);
}
#[test]
fn referenced_board_assets_are_hashed_but_unused_records_are_not_dependencies() {
    let (dir, mut store) = fixture();
    fs::create_dir(dir.path().join("attachments")).unwrap();
    fs::write(
        dir.path().join("attachments/ảnh.png"),
        b"synthetic media fingerprint fixture",
    )
    .unwrap();
    let path = dir.path().join("article.md");
    let source=fs::read_to_string(&path).unwrap().replace("Mnemonic\n","```tldraw\n{\"store\":{\"shape:image\":{\"typeName\":\"shape\",\"type\":\"image\",\"props\":{\"assetId\":\"asset:used\"}},\"asset:used\":{\"typeName\":\"asset\",\"props\":{\"src\":\"attachments/ảnh.png\"}},\"asset:unused\":{\"typeName\":\"asset\",\"props\":{\"src\":\"attachments/missing.png\"}}}}\n```\n");
    fs::write(path, source).unwrap();
    let result = session(&mut store);
    let item = result.current.unwrap();
    assert!(item.source_error.is_none());
    let content = serde_json::to_value(item.content).unwrap();
    assert_eq!(content["details"]["backMedia"].as_array().unwrap().len(), 1);
    assert_eq!(
        content["details"]["backMedia"][0]["path"],
        "attachments/ảnh.png"
    );
}
#[test]
fn missing_foreign_or_ephemeral_media_fails_closed_without_mutating_source() {
    for url in [
        "attachments/missing.png",
        "../outside.png",
        "blob:temporary-image",
        "javascript:alert(1)",
    ] {
        let (dir, mut store) = fixture();
        let path = dir.path().join("article.md");
        let source = fs::read_to_string(&path)
            .unwrap()
            .replace("Mnemonic\n", &format!("![image](<{url}>)\n"));
        fs::write(&path, &source).unwrap();
        let item = session(&mut store).current.unwrap();
        assert!(item.source_error.is_some(), "{url}");
        assert!(item.answer_page.is_none());
        assert_eq!(fs::read_to_string(path).unwrap(), source);
    }
}
#[test]
fn source_preview_recognizes_reference_images_and_ignores_unused_definitions_and_comments() {
    let (dir, store) = fixture();
    fs::create_dir(dir.path().join("attachments")).unwrap();
    fs::write(dir.path().join("attachments/ảnh.png"), b"synthetic media").unwrap();
    let path = dir.path().join("source.md");
    let source=fs::read_to_string(&path).unwrap().replace("Reference article\n","Reference ![hint][picture]\n[picture]: attachments/ảnh.png\n[unused]: attachments/missing.png\n<!-- ![comment](missing.png) -->\n");
    fs::write(path, source).unwrap();
    let preview = store.read_note_face(&id(2), MemoryFace::Front).unwrap();
    assert_eq!(preview.media.len(), 1);
    assert_eq!(preview.media[0].path, "attachments/ảnh.png");
}

fn change_source(changed: &str, root: &std::path::Path, store: &mut Store, source: &str) {
    match changed {
        "owner" => {
            let path = root.join("article.md");
            let source = fs::read_to_string(&path).unwrap();
            fs::write(path, source.replace("Article", "Changed article")).unwrap();
        }
        "target" => {
            fs::write(
                root.join("source.md"),
                source.replace("Reference article", "Changed reference"),
            )
            .unwrap();
        }
        "media" => {
            let path = root.join("attachments/ảnh.png");
            let modified = fs::metadata(&path).unwrap().modified().unwrap();
            fs::write(&path, b"other synthetic media bytes").unwrap();
            fs::File::open(path)
                .unwrap()
                .set_modified(modified)
                .unwrap();
        }
        _ => {
            fs::rename(root.join("source.md"), root.join("renamed.md")).unwrap();
            store
                .register_page(&id(2), "renamed.md", "Reference")
                .unwrap();
        }
    }
}

fn break_source(issue: &str, root: &std::path::Path) {
    match issue {
        "missing" => {
            fs::remove_file(root.join("source.md")).unwrap();
        }
        "recursive" => {
            let target = root.join("source.md");
            let source = fs::read_to_string(&target).unwrap();
            fs::write(
                target,
                patch_config(
                    &source,
                    &MemoryConfig {
                        version: 1,
                        enabled: false,
                        back: MemoryBack::Page {
                            page_id: id(1),
                            face: MemoryFace::Front,
                        },
                    },
                )
                .unwrap(),
            )
            .unwrap();
            let path = root.join("article.md");
            let source = fs::read_to_string(&path)
                .unwrap()
                .replace("_memnova_back_face: front", "_memnova_back_face: back");
            fs::write(path, source).unwrap();
        }
        "duplicate" => {
            fs::copy(root.join("article.md"), root.join("copy.md")).unwrap();
        }
        _ => {
            let path = root.join("article.md");
            let source = fs::read_to_string(&path).unwrap().replace(
                "_memnova_learning_enabled: true",
                "_memnova_learning_enabled: false",
            );
            fs::write(path, source).unwrap();
        }
    }
}

fn write_config(path: &std::path::Path, config: MemoryConfig) {
    let source = fs::read_to_string(path).unwrap();
    fs::write(path, patch_config(&source, &config).unwrap()).unwrap();
}

fn legacy_lane_card(store: &mut Store) -> super::Card {
    store
        .create_card(
            &id(3),
            super::CardDraft {
                property_definitions: None,
                answer_page_id: None,
                front: "Old question".into(),
                back: "Old answer".into(),
                answer_mode: "inline".into(),
                status: "active".into(),
                position: 0,
                properties: serde_json::json!({}),
            },
        )
        .unwrap()
}

#[test]
fn note_and_legacy_lanes_have_independent_scopes_without_bound_card_duplicates() {
    let (_directory, mut store) = fixture();
    let old = legacy_lane_card(&mut store);
    let note_card = store.note_binding(&id(1)).unwrap().unwrap().card_id;
    let mut session_ids = Vec::new();
    for (lane, expected) in [("notes", note_card), ("legacy", old.id)] {
        let scope: SessionScope =
            serde_json::from_value(serde_json::json!({"pageIds":null,"lane":lane})).unwrap();
        let session = store.start_session(scope).unwrap();
        assert_eq!(session.initial_count, 1);
        assert_eq!(session.current.unwrap().card.id, expected);
        session_ids.push(session.id);
    }
    assert_ne!(session_ids[0], session_ids[1]);
    assert!(store.note_binding(&id(2)).unwrap().is_none());
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM reviews", [], |row| row
                .get::<_, u32>(0))
            .unwrap(),
        0
    );
}

#[test]
fn saved_scope_without_a_lane_remains_legacy_and_keeps_its_serialized_shape() {
    let (_directory, mut store) = fixture();
    let old = legacy_lane_card(&mut store);
    let scope: SessionScope = serde_json::from_str("{\"pageIds\":null}").unwrap();
    let session = store.start_session(scope).unwrap();
    assert_eq!(session.initial_count, 1);
    assert_eq!(session.current.unwrap().card.id, old.id);
    let explicit: SessionScope =
        serde_json::from_value(serde_json::json!({"pageIds":null,"lane":"legacy"})).unwrap();
    assert_eq!(store.start_session(explicit).unwrap().id, session.id);
    let encoded: String = store
        .conn
        .query_row(
            "SELECT scope_json FROM sessions WHERE id=?1",
            [&session.id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(&encoded).unwrap(),
        serde_json::json!({"pageIds":null})
    );
}

#[test]
fn unrelated_duplicate_ids_do_not_disable_an_independent_note_but_ambiguous_back_sources_do() {
    for linked in [false, true] {
        let (directory, mut store) = fixture();
        if linked {
            link(
                &mut store,
                MemoryBack::Page {
                    page_id: id(2),
                    face: MemoryFace::Front,
                },
            );
        }
        let original = fs::read(directory.path().join("source.md")).unwrap();
        fs::write(directory.path().join("source-copy.md"), &original).unwrap();
        let before = store.read_note_memory(&id(1)).unwrap().schedule.unwrap();
        let view = store.read_note_memory(&id(1)).unwrap();
        assert_eq!(
            view.state,
            if linked {
                super::note_lifecycle::NoteLearningState::Invalid
            } else {
                super::note_lifecycle::NoteLearningState::Ready
            }
        );
        assert_eq!(
            store.read_note_memory(&id(2)).unwrap().state,
            super::note_lifecycle::NoteLearningState::Invalid
        );
        assert_eq!(view.schedule.unwrap(), before);
        assert_eq!(
            fs::read(directory.path().join("source.md")).unwrap(),
            original
        );
        assert_eq!(
            fs::read(directory.path().join("source-copy.md")).unwrap(),
            original
        );
    }
}

#[test]
fn m22_healthy_source_previews_ignore_unrelated_duplicate_identities_but_reject_their_own() {
    let (directory, mut store) = fixture();
    let unrelated = fs::read(directory.path().join("ordinary.md")).unwrap();
    fs::write(directory.path().join("ordinary-copy.md"), &unrelated).unwrap();
    let card = store.note_binding(&id(1)).unwrap().unwrap().card_id;
    let before = store.get_card(&card).unwrap().schedule;
    let preview = super::preview_note_source(
        directory.path(),
        &store.library_id,
        "source.md",
        MemoryFace::Front,
    )
    .unwrap();
    assert_eq!(preview.page_id, Some(id(2)));
    assert_eq!(
        store
            .ensure_page_with_hash("source.md", Some(&preview.source_hash))
            .unwrap()
            .id,
        id(2)
    );
    assert!(store.read_note_face(&id(2), MemoryFace::Front).is_ok());
    assert!(store.read_note_face(&id(3), MemoryFace::Front).is_err());
    assert_eq!(store.get_card(&card).unwrap().schedule, before);
    assert_eq!(
        fs::read(directory.path().join("ordinary-copy.md")).unwrap(),
        unrelated
    );
    assert!(store.note_binding(&id(2)).unwrap().is_none());
}
