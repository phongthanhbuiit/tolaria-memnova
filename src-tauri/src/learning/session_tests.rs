use super::storage_metadata::write_metadata;
use super::{CardDraft, MigrationState, Store};
use super::{RateRequest, SessionScope};

fn fixture() -> (tempfile::TempDir, Store, String) {
    let dir = tempfile::tempdir().unwrap();
    let mut store = Store::open(dir.path()).unwrap();
    let page = uuid::Uuid::new_v4().to_string();
    std::fs::write(
        dir.path().join("lesson.md"),
        format!("---\n_memnova_page_id: {page}\n---\n# Lesson\nWhole lesson answer\n"),
    )
    .unwrap();
    store.register_page(&page, "lesson.md", "Lesson").unwrap();
    let transaction = store.conn.transaction().unwrap();
    write_metadata(&transaction, "migrationState", &MigrationState::Ready).unwrap();
    transaction.commit().unwrap();
    (dir, store, page)
}

fn card(store: &mut Store, page: &str) -> super::Card {
    store
        .create_card(
            page,
            CardDraft {
                answer_page_id: None,
                front: "Question".into(),
                back: "Answer".into(),
                answer_mode: "inline".into(),
                status: "active".into(),
                position: 0,
                properties: serde_json::json!({"IPA":"/test/"}),
            },
        )
        .unwrap()
}

fn request(session: &super::StudySession, rating: u8, learning: bool) -> RateRequest {
    let item = session.current.as_ref().unwrap();
    let mut next = item.card.schedule.clone();
    let now = chrono::Utc::now();
    next.reps += 1;
    next.revision += 1;
    next.last_review = Some(now.to_rfc3339());
    next.due = (now + chrono::Duration::minutes(if learning { 1 } else { 1440 })).to_rfc3339();
    next.engine = "ts-fsrs@5.4.2".into();
    next.state = if learning { "learning" } else { "review" }.into();
    next.stability = 2.0;
    next.difficulty = 5.0;
    RateRequest {
        review_id: uuid::Uuid::new_v4().to_string(),
        session_id: session.id.clone(),
        session_revision: session.revision,
        card_id: item.card.id.clone(),
        card_revision: item.card.revision,
        source_fingerprint: item.page.as_ref().unwrap().fingerprint.clone(),
        answer_fingerprint: item
            .answer_page
            .as_ref()
            .map(|page| page.fingerprint.clone()),
        rating,
        duration_ms: 2000,
        reviewed_at: now.timestamp_millis(),
        schedule: next,
    }
}

#[test]
fn ratings_are_atomic_idempotent_and_resume_after_reopening() {
    let (dir, mut store, page) = fixture();
    card(&mut store, &page);
    card(&mut store, &page);
    let session = store
        .start_session(SessionScope {
            page_ids: Some(vec![page]),
        })
        .unwrap();
    assert_eq!(session.initial_count, 2);
    let grade = request(&session, 3, false);
    let result = store.rate_card(grade.clone()).unwrap();
    assert_eq!(result.session.review_count, 1);
    assert_ne!(
        result.session.current.as_ref().unwrap().card.id,
        grade.card_id
    );
    assert_eq!(
        store.rate_card(grade.clone()).unwrap().session.review_count,
        1
    );
    let mut changed = grade.clone();
    changed.rating = 4;
    assert!(store.rate_card(changed).is_err());
    drop(store);
    let mut store = Store::open(dir.path()).unwrap();
    let resumed = store.resume_session(&session.id).unwrap();
    assert_eq!(resumed.review_count, 1);
    assert_eq!(resumed.current_index, 1);
    assert_eq!(store.get_card(&grade.card_id).unwrap().schedule.reps, 1);
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM reviews", [], |row| row
                .get::<_, i64>(0))
            .unwrap(),
        1
    );
}

#[test]
fn failed_review_write_rolls_back_schedule_and_cursor_and_can_retry() {
    let (_dir, mut store, page) = fixture();
    card(&mut store, &page);
    let session = store
        .start_session(SessionScope { page_ids: None })
        .unwrap();
    let grade = request(&session, 3, false);
    store.conn.execute_batch("CREATE TRIGGER fail_review BEFORE INSERT ON reviews BEGIN SELECT RAISE(ABORT,'disk simulation'); END;").unwrap();
    assert!(store.rate_card(grade.clone()).is_err());
    assert_eq!(store.get_card(&grade.card_id).unwrap().schedule.reps, 0);
    assert_eq!(store.resume_session(&session.id).unwrap().review_count, 0);
    store
        .conn
        .execute_batch("DROP TRIGGER fail_review;")
        .unwrap();
    assert_eq!(store.rate_card(grade).unwrap().session.review_count, 1);
}

#[test]
fn again_reinserts_and_waits_without_claiming_completion() {
    let (_dir, mut store, page) = fixture();
    card(&mut store, &page);
    let session = store
        .start_session(SessionScope { page_ids: None })
        .unwrap();
    let grade = request(&session, 1, true);
    let result = store.rate_card(grade).unwrap();
    assert_eq!(result.session.status, "active");
    assert_eq!(result.session.completed_count, 0);
    assert_eq!(result.session.review_count, 1);
    assert!(result.session.current.is_none());
    assert!(result.session.waiting_until.is_some());
}

#[test]
fn undo_restores_memory_with_a_new_revision_and_removes_reinserted_work() {
    let (_dir, mut store, page) = fixture();
    let original = card(&mut store, &page);
    let session = store
        .start_session(SessionScope { page_ids: None })
        .unwrap();
    let grade = request(&session, 1, true);
    let result = store.rate_card(grade.clone()).unwrap();
    let restored = store
        .undo_review(&session.id, &grade.review_id, result.session.revision)
        .unwrap();
    assert_eq!(restored.current_index, 0);
    assert_eq!(restored.review_count, 0);
    assert_eq!(restored.current.as_ref().unwrap().card.id, original.id);
    let schedule = store.get_card(&original.id).unwrap().schedule;
    assert_eq!(schedule.reps, 0);
    assert_eq!(schedule.revision, 2);
    assert_eq!(schedule.engine, original.schedule.engine);
    assert!(store.rate_card(grade).is_err());
}

#[test]
fn scoped_empty_sessions_never_fall_back_to_unrelated_cards() {
    let (_dir, mut store, page) = fixture();
    card(&mut store, &page);
    let session = store
        .start_session(SessionScope {
            page_ids: Some(vec![]),
        })
        .unwrap();
    assert_eq!(session.initial_count, 0);
    assert_eq!(session.status, "completed");
}

#[test]
fn stale_card_source_or_session_revisions_cannot_advance_learning() {
    let (dir, mut store, page) = fixture();
    let original = card(&mut store, &page);
    let session = store
        .start_session(SessionScope { page_ids: None })
        .unwrap();
    let grade = request(&session, 3, false);
    let mut draft = original.draft.clone();
    draft.front = "Changed question".into();
    store
        .update_card(&original.id, original.revision, draft)
        .unwrap();
    assert!(store.rate_card(grade.clone()).is_err());
    let session = store.resume_session(&session.id).unwrap();
    let grade = request(&session, 3, false);
    std::fs::write(dir.path().join("lesson.md"), "External user edit").unwrap();
    assert!(store.rate_card(grade).is_err());
    assert_eq!(store.get_card(&original.id).unwrap().schedule.reps, 0);
}

#[test]
fn overlapping_windows_reject_stale_ratings_and_skip_work_completed_elsewhere() {
    let (_dir, mut store, page) = fixture();
    card(&mut store, &page);
    let all = store
        .start_session(SessionScope { page_ids: None })
        .unwrap();
    let scoped = store
        .start_session(SessionScope {
            page_ids: Some(vec![page]),
        })
        .unwrap();
    let stale = request(&scoped, 3, false);
    store.rate_card(request(&all, 3, false)).unwrap();
    assert!(store.rate_card(stale).is_err());
    let resumed = store.get_session(&scoped.id).unwrap();
    assert_eq!(resumed.status, "completed");
    assert_eq!(resumed.review_count, 0);
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM reviews", [], |row| row
                .get::<_, i64>(0))
            .unwrap(),
        1
    );
}

#[test]
fn source_errors_are_recoverable_without_awarding_credit_for_a_skip() {
    let (dir, mut store, page) = fixture();
    let card = card(&mut store, &page);
    let session = store
        .start_session(SessionScope { page_ids: None })
        .unwrap();
    std::fs::remove_file(dir.path().join("lesson.md")).unwrap();
    let broken = store.get_session(&session.id).unwrap();
    assert!(broken.current.as_ref().unwrap().source_error.is_some());
    let skipped = store
        .skip_session_card(&session.id, broken.revision)
        .unwrap();
    assert_eq!(skipped.status, "completed");
    assert_eq!(skipped.review_count, 0);
    assert_eq!(store.get_card(&card.id).unwrap().schedule.reps, 0);
}

#[test]
fn undo_does_not_offer_or_overwrite_a_schedule_changed_since_the_review() {
    let (_dir, mut store, page) = fixture();
    let card = card(&mut store, &page);
    let session = store
        .start_session(SessionScope { page_ids: None })
        .unwrap();
    let grade = request(&session, 3, false);
    let rated = store.rate_card(grade.clone()).unwrap();
    let mut next = store.get_card(&card.id).unwrap().schedule;
    next.revision += 1;
    next.stability += 1.0;
    let transaction = store.conn.transaction().unwrap();
    super::cards::write_schedule(&transaction, &card.id, &next).unwrap();
    transaction.commit().unwrap();
    assert!(store
        .undo_review(&session.id, &grade.review_id, rated.session.revision)
        .is_err());
    assert!(!store.get_session(&session.id).unwrap().can_undo);
    assert_eq!(store.get_card(&card.id).unwrap().schedule, next);
}

#[test]
fn learning_deadline_becomes_ready_without_rebuilding_or_completing_the_queue() {
    let (_dir, mut store, page) = fixture();
    let card = card(&mut store, &page);
    let session = store
        .start_session(SessionScope { page_ids: None })
        .unwrap();
    let result = store.rate_card(request(&session, 1, true)).unwrap();
    let due = result.session.waiting_until.unwrap();
    let waiting = store.session_at(&session.id, due - 1).unwrap();
    assert!(waiting.current.is_none());
    let ready = store.session_at(&session.id, due).unwrap();
    assert_eq!(ready.current.as_ref().unwrap().card.id, card.id);
    assert_eq!(ready.initial_count, 1);
    assert_eq!(ready.review_count, 1);
    assert_eq!(ready.completed_count, 0);
}

#[test]
fn daily_combo_resets_without_regranting_xp_for_previous_days() {
    let (_dir, mut store, page) = fixture();
    for _ in 0..3 {
        card(&mut store, &page);
    }
    let first = store
        .start_session(SessionScope { page_ids: None })
        .unwrap();
    let first = store.rate_card(request(&first, 3, false)).unwrap();
    assert_eq!(first.earned_xp, 7);
    let second = store.rate_card(request(&first.session, 3, false)).unwrap();
    assert_eq!(second.earned_xp, 7);
    store
        .conn
        .execute("UPDATE reviews SET reviewed_at=reviewed_at-86400000", [])
        .unwrap();
    let third = store.rate_card(request(&second.session, 3, false)).unwrap();
    assert_eq!(third.earned_xp, 7);
    assert_eq!(third.session.review_count, 3);
}

#[test]
fn linked_answer_changes_reject_unseen_content_but_committed_receipts_replay_once() {
    let (dir, mut store, page) = fixture();
    let original = card(&mut store, &page);
    std::fs::write(dir.path().join("source.md"), "# Source\n\nLinked answer").unwrap();
    let source = store.ensure_page("source.md").unwrap();
    let mut draft = original.draft.clone();
    draft.answer_mode = "page".into();
    draft.answer_page_id = Some(source.id);
    let linked = store
        .update_card(&original.id, original.revision, draft)
        .unwrap();
    let session = store.start_session(SessionScope::default()).unwrap();
    let stale = request(&session, 3, false);
    assert!(stale.answer_fingerprint.is_some());
    let content = std::fs::read_to_string(dir.path().join("source.md")).unwrap();
    std::fs::write(
        dir.path().join("source.md"),
        content.replace("Linked answer", "Changed before rating"),
    )
    .unwrap();
    assert!(store.rate_card(stale).is_err());
    assert_eq!(store.get_card(&linked.id).unwrap().schedule.reps, 0);
    let fresh = request(&store.get_session(&session.id).unwrap(), 3, false);
    let committed = store.rate_card(fresh.clone()).unwrap();
    assert_eq!(committed.session.review_count, 1);
    std::fs::remove_file(dir.path().join("source.md")).unwrap();
    drop(store);
    let mut store = Store::open(dir.path()).unwrap();
    assert!(store.rate_card(fresh.clone()).unwrap().replayed);
    assert_eq!(store.study_stats().unwrap().today_reviews, 1);
    let current = store.get_session(&session.id).unwrap();
    store
        .undo_review(&session.id, &fresh.review_id, current.revision)
        .unwrap();
    assert_eq!(store.get_card(&linked.id).unwrap().schedule.reps, 0);
    assert_eq!(store.study_stats().unwrap().today_reviews, 0);
}

#[test]
fn legacy_owner_only_receipts_remain_readable_and_replayable() {
    let (_dir, mut store, page) = fixture();
    card(&mut store, &page);
    let session = store.start_session(SessionScope::default()).unwrap();
    let grade = request(&session, 3, false);
    let mut legacy = serde_json::to_value(&grade).unwrap();
    legacy.as_object_mut().unwrap().remove("answerFingerprint");
    let legacy: RateRequest = serde_json::from_value(legacy).unwrap();
    assert!(legacy.answer_fingerprint.is_none());
    store.rate_card(legacy.clone()).unwrap();
    assert!(store.rate_card(legacy).unwrap().replayed);
    assert_eq!(store.study_stats().unwrap().today_reviews, 1);
}
