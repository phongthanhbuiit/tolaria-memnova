use super::storage_metadata::{read_metadata, write_metadata};
use super::{CardDraft, MigrationState, Store};

fn fixture() -> (tempfile::TempDir, Store) {
    let dir = tempfile::tempdir().unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    let transaction = store.conn.transaction().unwrap();
    write_metadata(&transaction, "migrationState", &MigrationState::Ready).unwrap();
    transaction.commit().unwrap();
    (dir, store)
}

#[test]
fn page_registration_backs_up_source_once_and_rename_keeps_the_same_cards() {
    let (dir, mut store) = fixture();
    let original = "# My lesson\n\n    preserve indentation\n";
    std::fs::write(dir.path().join("lesson.md"), original).unwrap();
    let page = store.ensure_page("lesson.md").unwrap();
    let source = std::fs::read_to_string(dir.path().join("lesson.md")).unwrap();
    assert!(source.ends_with(original));
    let backups = std::fs::read_dir(dir.path().join(".memnova/backups"))
        .unwrap()
        .count();
    assert_eq!(backups, 1);
    assert_eq!(store.ensure_page("lesson.md").unwrap().id, page.id);
    assert_eq!(
        std::fs::read_dir(dir.path().join(".memnova/backups"))
            .unwrap()
            .count(),
        backups
    );
    let card = store
        .create_card(
            &page.id,
            CardDraft {
                answer_page_id: None,
                front: "First".into(),
                back: "Answer".into(),
                answer_mode: "inline".into(),
                status: "active".into(),
                position: 0,
                properties: serde_json::json!({}),
            },
        )
        .unwrap();
    std::fs::rename(dir.path().join("lesson.md"), dir.path().join("renamed.md")).unwrap();
    let pages = store.sync_pages().unwrap();
    assert_eq!(pages[0].id, page.id);
    assert_eq!(pages[0].path, "renamed.md");
    assert_eq!(store.get_card(&card.id).unwrap().page_id, page.id);
    assert_eq!(store.get_card(&card.id).unwrap().schedule.reps, 0);
}

#[test]
fn stale_editor_content_cannot_drop_or_replace_a_learning_page_identity() {
    let (dir, mut store) = fixture();
    std::fs::write(dir.path().join("lesson.md"), "# Lesson").unwrap();
    let page = store.ensure_page("lesson.md").unwrap();
    let normalized = super::page_content::prepare_save(
        dir.path(),
        &dir.path().join("lesson.md"),
        "# User changes",
    )
    .unwrap();
    assert!(normalized.contains(&page.id));
    assert!(normalized.ends_with("# User changes"));
    let foreign = format!(
        "---\n_memnova_page_id: {}\n---\nWrong identity",
        uuid::Uuid::new_v4()
    );
    assert!(
        super::page_content::prepare_save(dir.path(), &dir.path().join("lesson.md"), &foreign)
            .is_err()
    );
    assert!(!std::fs::read_to_string(dir.path().join("lesson.md"))
        .unwrap()
        .contains("User changes"));
}

#[test]
fn replacing_a_deleted_page_does_not_attach_its_old_cards_to_a_new_lesson() {
    let (dir, mut store) = fixture();
    std::fs::write(dir.path().join("lesson.md"), "# Old").unwrap();
    let old = store.ensure_page("lesson.md").unwrap();
    let card = store
        .create_card(
            &old.id,
            CardDraft {
                answer_page_id: None,
                front: "Old".into(),
                back: "Answer".into(),
                answer_mode: "inline".into(),
                status: "active".into(),
                position: 0,
                properties: serde_json::json!({}),
            },
        )
        .unwrap();
    let incoming = super::page_content::prepare_create(dir.path(), "# New").unwrap();
    std::fs::write(dir.path().join("lesson.md"), incoming).unwrap();
    store.sync_pages().unwrap();
    let new = store.ensure_page("lesson.md").unwrap();
    assert_ne!(new.id, old.id);
    assert!(store.list_cards(Some(&new.id), false).unwrap().is_empty());
    assert_eq!(store.get_card(&card.id).unwrap().page_id, old.id);
    assert!(store
        .list_pages()
        .unwrap()
        .iter()
        .any(|page| page.id == old.id && !page.available));
    store.sync_pages().unwrap();
    assert_eq!(
        read_metadata::<String>(&store.conn, &format!("retiredPath:{}", old.id))
            .unwrap()
            .as_deref(),
        Some("lesson.md")
    );
}

#[test]
fn native_stats_preserve_the_profile_and_undo_excludes_the_new_review() {
    let (dir, mut store) = fixture();
    let day = chrono::Local::now().format("%Y-%m-%d").to_string();
    let transaction = store.conn.transaction().unwrap();
    write_metadata(&transaction,"legacyProfile",&serde_json::json!({"totalXp":1234,"streak":2,"lastStudyDate":day,"todayReviews":4,"todayCorrect":3,"todayXp":8,"todayDurationMs":100,"heatmap":[{"date":day,"count":4}],"combo":2})).unwrap();
    transaction.commit().unwrap();
    std::fs::write(dir.path().join("lesson.md"), "# Lesson").unwrap();
    let page = store.ensure_page("lesson.md").unwrap();
    store
        .create_card(
            &page.id,
            CardDraft {
                answer_page_id: None,
                front: "Question".into(),
                back: "Answer".into(),
                answer_mode: "inline".into(),
                status: "active".into(),
                position: 0,
                properties: serde_json::json!({}),
            },
        )
        .unwrap();
    let session = store
        .start_session(super::SessionScope { page_ids: None })
        .unwrap();
    let item = session.current.as_ref().unwrap();
    let now = chrono::Utc::now();
    let mut next = item.card.schedule.clone();
    next.engine = "ts-fsrs@5.4.2".into();
    next.reps = 1;
    next.revision = 1;
    next.state = "review".into();
    next.stability = 2.0;
    next.difficulty = 5.0;
    next.last_review = Some(now.to_rfc3339());
    next.due = (now + chrono::Duration::days(1)).to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();
    let review = super::RateRequest {
        review_id: id.clone(),
        session_id: session.id.clone(),
        session_revision: session.revision,
        card_id: item.card.id.clone(),
        card_revision: item.card.revision,
        source_fingerprint: item.page.as_ref().unwrap().fingerprint.clone(),
        answer_fingerprint: item
            .answer_page
            .as_ref()
            .map(|page| page.fingerprint.clone()),
        rating: 3,
        duration_ms: 2000,
        reviewed_at: now.timestamp_millis(),
        schedule: next,
    };
    let rated = store.rate_card(review).unwrap();
    let stats = store.study_stats().unwrap();
    assert_eq!(stats.total_xp, 1244);
    assert_eq!(stats.today_reviews, 5);
    assert_eq!(stats.today_correct, 4);
    assert_eq!(stats.heatmap.last().unwrap().count, 5);
    store
        .undo_review(&session.id, &id, rated.session.revision)
        .unwrap();
    let stats = store.study_stats().unwrap();
    assert_eq!(stats.total_xp, 1234);
    assert_eq!(stats.today_reviews, 4);
    store.set_daily_goal(35).unwrap();
    assert_eq!(store.study_stats().unwrap().daily_goal, 35);
    assert_eq!(
        read_metadata::<u64>(&store.conn, "dailyGoal").unwrap(),
        Some(35)
    );
}

#[test]
fn private_learning_snapshots_cannot_be_registered_or_modified_as_lessons() {
    let (dir, mut store) = fixture();
    let folder = dir.path().join(".memnova/notes");
    std::fs::create_dir_all(&folder).unwrap();
    let path = folder.join("snapshot.md");
    std::fs::write(&path, "private snapshot").unwrap();
    assert!(store.ensure_page(".memnova/notes/snapshot.md").is_err());
    assert_eq!(std::fs::read_to_string(path).unwrap(), "private snapshot");
}

#[test]
fn retrying_card_creation_uses_one_identity_and_never_overwrites_a_different_card() {
    let (dir, mut store) = fixture();
    std::fs::write(dir.path().join("lesson.md"), "# Lesson").unwrap();
    let page = store.ensure_page("lesson.md").unwrap();
    let operation = uuid::Uuid::new_v4().to_string();
    let draft = CardDraft {
        answer_page_id: None,
        front: "Question".into(),
        back: "Answer".into(),
        answer_mode: "inline".into(),
        status: "draft".into(),
        position: 0,
        properties: serde_json::json!({}),
    };
    let first = store
        .create_card_once(&operation, &page.id, draft.clone())
        .unwrap();
    let second = store
        .create_card_once(&operation, &page.id, draft.clone())
        .unwrap();
    assert_eq!(first.id, second.id);
    assert_eq!(store.list_cards(Some(&page.id), true).unwrap().len(), 1);
    let mut changed = draft;
    changed.front = "Different intent".into();
    assert!(store
        .create_card_once(&operation, &page.id, changed)
        .is_err());
    assert_eq!(store.get_card(&first.id).unwrap().front, "Question");
}

#[test]
fn known_legacy_history_is_visible_without_a_profile_and_is_not_counted_twice_with_one() {
    let (dir, mut store) = fixture();
    std::fs::write(dir.path().join("lesson.md"), "# Lesson").unwrap();
    let page = store.ensure_page("lesson.md").unwrap();
    let card = store
        .create_card(
            &page.id,
            CardDraft {
                answer_page_id: None,
                front: "Question".into(),
                back: "Answer".into(),
                answer_mode: "inline".into(),
                status: "active".into(),
                position: 0,
                properties: serde_json::json!({}),
            },
        )
        .unwrap();
    store.conn.execute("INSERT INTO reviews(id,card_id,rating,reviewed_at,engine) VALUES('legacy-known',?1,3,?2,'legacy-fsrs5')",(&card.id,chrono::Utc::now().timestamp_millis())).unwrap();
    let stats = store.study_stats().unwrap();
    assert_eq!(stats.today_reviews, 1);
    assert_eq!(stats.today_correct, 1);
    assert_eq!(stats.total_xp, 0);
    let day = chrono::Local::now().format("%Y-%m-%d").to_string();
    let transaction = store.conn.transaction().unwrap();
    write_metadata(&transaction,"legacyProfile",&serde_json::json!({"totalXp":100,"lastStudyDate":day,"todayReviews":1,"todayCorrect":1,"heatmap":[{"date":day,"count":1}]})).unwrap();
    transaction.commit().unwrap();
    let stats = store.study_stats().unwrap();
    assert_eq!(stats.today_reviews, 1);
    assert_eq!(stats.heatmap.last().unwrap().count, 1);
    assert_eq!(stats.total_xp, 100);
}

#[test]
fn page_registration_waits_for_another_writer_instead_of_failing_a_snapshot_upgrade() {
    use std::sync::mpsc;
    use std::time::Duration;
    let (dir, mut writer) = fixture();
    std::fs::write(dir.path().join("lesson.md"), "# Lesson").unwrap();
    let page = writer.ensure_page("lesson.md").unwrap();
    let mut reader = Store::open(dir.path()).unwrap();
    writer.conn.execute_batch("BEGIN IMMEDIATE").unwrap();
    let (started, ready) = mpsc::sync_channel(0);
    let (finished, result) = mpsc::channel();
    let worker = std::thread::spawn(move || {
        started.send(()).unwrap();
        finished
            .send(reader.ensure_page("lesson.md").map(|page| page.id))
            .unwrap();
    });
    ready.recv().unwrap();
    let early = result.recv_timeout(Duration::from_millis(150));
    writer.conn.execute_batch("COMMIT").unwrap();
    let waited = early.is_err();
    let outcome = early.unwrap_or_else(|_| result.recv_timeout(Duration::from_secs(5)).unwrap());
    worker.join().unwrap();
    assert!(
        waited,
        "Registration failed before the busy writer released its lock: {outcome:?}"
    );
    assert_eq!(outcome.unwrap(), page.id);
}
