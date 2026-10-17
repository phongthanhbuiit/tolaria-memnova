use super::{preview_migration, MigrationState, Store};
use serde_json::json;

fn fixture() -> (tempfile::TempDir, Store, String, String) {
    let dir = tempfile::tempdir().unwrap();
    let original = "---\r\n# retain metadata formatting\r\n_fsrs_enabled: true\r\n_fsrs_state: review\r\n_fsrs_due: '2027-01-04T10:30:00+07:00'\r\n_fsrs_stability: 19.25\r\n_fsrs_difficulty: 4.75\r\n_fsrs_elapsed_days: 8\r\n_fsrs_scheduled_days: 25\r\n_fsrs_reps: 41\r\n_fsrs_lapses: 3\r\n_fsrs_last_review: '2026-10-10T10:30:00+07:00'\r\nIPA: '/test/'\r\naudio: attachments/audio.mp3\r\n---\r\n# Câu hỏi\r\n\r\n<!-- FLASHCARD:BACK -->\r\n\r\n    indented answer\r\n";
    std::fs::write(dir.path().join("a-card.md"), original).unwrap();
    std::fs::write(
        dir.path().join("b-lesson.md"),
        "\u{feff}\n    bài học nguyên gốc\r\n",
    )
    .unwrap();
    let fingerprint = preview_migration(dir.path(), None).unwrap().fingerprint;
    let store = Store::open(dir.path()).unwrap();
    (dir, store, fingerprint, original.into())
}

fn finish(store: &mut Store) -> super::MigrationProgress {
    for _ in 0..10 {
        let progress = store.resume_migration(1).unwrap();
        if progress.state == MigrationState::Ready {
            return progress;
        }
    }
    panic!("migration did not finish its bounded batches")
}

#[test]
fn verified_backup_precedes_page_writes_and_import_never_resets_legacy_memory() {
    let (dir, mut store, fingerprint, original) = fixture();
    let profile = json!({"totalXp":1234,"dailyGoal":45,"heatmap":[{"date":"2026-10-10","count":8}],"custom":"giữ nguyên"}).to_string();
    let prepared = store
        .prepare_migration(&fingerprint, Some(profile.clone()), None)
        .unwrap();
    assert_eq!(prepared.state, MigrationState::Migrating);
    assert_eq!(prepared.imported_pages, 0);
    assert_eq!(
        std::fs::read_to_string(dir.path().join("a-card.md")).unwrap(),
        original
    );
    let backup = store
        .verify_backup(prepared.backup_id.as_deref().unwrap())
        .unwrap();
    assert_eq!(
        std::fs::read_to_string(
            dir.path()
                .join(".memnova/backups")
                .join(&backup.id)
                .join("files/a-card.md")
        )
        .unwrap(),
        original
    );
    let ready = finish(&mut store);
    assert_eq!(ready.imported_pages, 2);
    assert_eq!(ready.imported_cards, 1);
    let cards = store.list_cards(None, true).unwrap();
    assert_eq!(cards.len(), 1);
    let card = &cards[0];
    assert_eq!(card.schedule.due, "2027-01-04T10:30:00+07:00");
    assert_eq!(card.schedule.reps, 41);
    assert_eq!(card.schedule.lapses, 3);
    assert_eq!(card.schedule.stability, 19.25);
    assert_eq!(card.schedule.difficulty, 4.75);
    assert_eq!(card.schedule.engine, "legacy-fsrs5");
    assert_eq!(card.back, "    indented answer\r\n");
    assert_eq!(card.properties["audio"], "attachments/audio.mp3");
    let updated = std::fs::read_to_string(dir.path().join("a-card.md")).unwrap();
    assert_eq!(
        updated.replacen(&format!("_memnova_page_id: {}\r\n", card.page_id), "", 1),
        original
    );
    assert_eq!(
        super::storage_metadata::read_metadata::<String>(&store.conn, "legacyProfileRaw").unwrap(),
        Some(profile)
    );
    assert_eq!(
        super::storage_metadata::read_metadata::<u32>(&store.conn, "dailyGoal").unwrap(),
        Some(45)
    );
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM reviews", [], |row| row
                .get::<_, i64>(0))
            .unwrap(),
        0
    );
}

#[test]
fn interrupted_database_import_resumes_the_same_written_page_id_without_duplicates() {
    let (dir, mut store, fingerprint, _) = fixture();
    store.prepare_migration(&fingerprint, None, None).unwrap();
    store.conn.execute_batch("CREATE TRIGGER fail_import BEFORE INSERT ON cards BEGIN SELECT RAISE(ABORT,'simulated database interruption'); END;").unwrap();
    assert!(store.resume_migration(1).is_err());
    let source = std::fs::read_to_string(dir.path().join("a-card.md")).unwrap();
    let (metadata, _) = super::legacy_markdown::frontmatter(&source).unwrap();
    let id = super::legacy_markdown::page_id(&metadata).unwrap().unwrap();
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM cards", [], |row| row.get::<_, i64>(0))
            .unwrap(),
        0
    );
    drop(store);
    let mut reopened = Store::open(dir.path()).unwrap();
    reopened
        .conn
        .execute_batch("DROP TRIGGER fail_import;")
        .unwrap();
    finish(&mut reopened);
    assert_eq!(reopened.list_cards(Some(&id), true).unwrap().len(), 1);
    assert_eq!(reopened.list_cards(None, true).unwrap().len(), 1);
    assert_eq!(
        reopened.resume_migration(1).unwrap().state,
        MigrationState::Ready
    );
}

#[test]
fn stale_preview_and_external_edits_never_get_overwritten() {
    let (dir, mut store, fingerprint, original) = fixture();
    std::fs::write(
        dir.path().join("a-card.md"),
        format!("{original}\nExternal edit"),
    )
    .unwrap();
    assert!(store.prepare_migration(&fingerprint, None, None).is_err());
    assert_eq!(store.migration_state().unwrap(), MigrationState::Legacy);
    let current = preview_migration(dir.path(), None).unwrap().fingerprint;
    store.prepare_migration(&current, None, None).unwrap();
    let external = format!("{original}\nSecond external edit");
    std::fs::write(dir.path().join("a-card.md"), &external).unwrap();
    assert!(store.resume_migration(1).is_err());
    assert_eq!(
        std::fs::read_to_string(dir.path().join("a-card.md")).unwrap(),
        external
    );
    assert_eq!(store.migration_state().unwrap(), MigrationState::Migrating);
}

#[test]
fn repeating_migration_after_cutover_does_not_reset_cards_or_create_new_backups() {
    let (dir, mut store, fingerprint, _) = fixture();
    store.prepare_migration(&fingerprint, None, None).unwrap();
    finish(&mut store);
    let card = store.list_cards(None, true).unwrap().remove(0);
    store
        .conn
        .execute(
            "UPDATE schedules SET reps=99,due='2099-01-01T00:00:00Z' WHERE card_id=?1",
            [&card.id],
        )
        .unwrap();
    let before = std::fs::read_dir(dir.path().join(".memnova/backups"))
        .unwrap()
        .count();
    assert_eq!(
        store
            .prepare_migration(&fingerprint, None, None)
            .unwrap()
            .state,
        MigrationState::Ready
    );
    assert_eq!(store.get_card(&card.id).unwrap().schedule.reps, 99);
    assert_eq!(
        store.get_card(&card.id).unwrap().schedule.due,
        "2099-01-01T00:00:00Z"
    );
    assert_eq!(
        std::fs::read_dir(dir.path().join(".memnova/backups"))
            .unwrap()
            .count(),
        before
    );
}

#[test]
fn available_legacy_history_imports_once_without_inventing_rows_from_reps() {
    let (dir, mut store, _, _) = fixture();
    let log = tempfile::NamedTempFile::new().unwrap();
    let record = json!({"ts":1700000000_i64,"note_path":dir.path().join("a-card.md"),"rating":3,"state_before":"review","scheduled_days":14}).to_string();
    let relative = json!({"ts":1700000001_i64,"note_path":"a-card.md","rating":2,"state_before":"review","scheduled_days":3}).to_string();
    let raw = format!("{record}\r\n{record}\r\n{relative}\r\n");
    std::fs::write(log.path(), &raw).unwrap();
    let fingerprint = preview_migration(dir.path(), Some(log.path()))
        .unwrap()
        .fingerprint;
    store
        .prepare_migration(&fingerprint, None, Some(log.path()))
        .unwrap();
    let ready = finish(&mut store);
    assert_eq!(ready.imported_reviews, 2);
    assert_eq!(
        store
            .conn
            .query_row("SELECT count(*) FROM reviews", [], |row| row
                .get::<_, i64>(0))
            .unwrap(),
        2
    );
    assert_eq!(store.conn.query_row("SELECT count(*) FROM reviews WHERE before_json IS NULL AND after_json IS NULL AND duration_ms IS NULL", [], |row| row.get::<_, i64>(0)).unwrap(), 2);
    assert_eq!(
        super::storage_metadata::read_metadata::<String>(&store.conn, "legacyReviewLogRaw")
            .unwrap(),
        Some(raw)
    );
    assert_eq!(store.list_cards(None, true).unwrap()[0].schedule.reps, 41);
    assert_eq!(store.resume_migration(1).unwrap().imported_reviews, 2);
}

#[test]
fn a_partial_migration_backup_can_resume_in_a_different_directory() {
    let (dir, mut store, _, _) = fixture();
    let log = tempfile::NamedTempFile::new().unwrap();
    let record = json!({"ts":1700000000_i64,"note_path":dir.path().join("a-card.md"),"rating":3,"state_before":"review","scheduled_days":14}).to_string();
    std::fs::write(log.path(), format!("{record}\n")).unwrap();
    let fingerprint = preview_migration(dir.path(), Some(log.path()))
        .unwrap()
        .fingerprint;
    store
        .prepare_migration(
            &fingerprint,
            Some(json!({"totalXp":4321,"dailyGoal":30}).to_string()),
            Some(log.path()),
        )
        .unwrap();
    let partial = store.resume_migration(1).unwrap();
    assert_eq!(partial.state, MigrationState::Migrating);
    let backup = store.create_backup().unwrap();
    let parent = tempfile::tempdir().unwrap();
    let target = parent.path().join("restored");
    store.restore_backup(&backup.id, &target).unwrap();
    let mut restored = Store::open(&target).unwrap();
    let ready = finish(&mut restored);
    assert_eq!(ready.imported_reviews, 1);
    assert_eq!(restored.library_id, store.library_id);
    assert_eq!(restored.list_cards(None, true).unwrap().len(), 1);
    assert_eq!(
        super::storage_metadata::read_metadata::<serde_json::Value>(
            &restored.conn,
            "legacyProfile"
        )
        .unwrap()
        .unwrap()["totalXp"],
        4321
    );
}

#[test]
fn original_pre_migration_backup_retains_history_attribution_after_restore() {
    let (dir, mut store, _, _) = fixture();
    let log = tempfile::NamedTempFile::new().unwrap();
    let record = json!({"ts":1700000000_i64,"note_path":dir.path().join("a-card.md"),"rating":3,"state_before":"review","scheduled_days":14}).to_string();
    std::fs::write(log.path(), format!("{record}\n")).unwrap();
    let fingerprint = preview_migration(dir.path(), Some(log.path()))
        .unwrap()
        .fingerprint;
    let prepared = store
        .prepare_migration(
            &fingerprint,
            Some(json!({"totalXp":4321,"dailyGoal":30}).to_string()),
            Some(log.path()),
        )
        .unwrap();
    let parent = tempfile::tempdir().unwrap();
    let target = parent.path().join("original-restored");
    store
        .restore_backup(prepared.backup_id.as_deref().unwrap(), &target)
        .unwrap();
    let mut restored = Store::open(&target).unwrap();
    let preview = preview_migration(&target, None).unwrap();
    restored
        .prepare_migration(&preview.fingerprint, None, None)
        .unwrap();
    assert_eq!(finish(&mut restored).imported_reviews, 1);
    assert_eq!(
        super::storage_metadata::read_metadata::<serde_json::Value>(
            &restored.conn,
            "legacyProfile"
        )
        .unwrap()
        .unwrap()["totalXp"],
        4321
    );
}

#[cfg(unix)]
#[test]
fn resume_rejects_source_replaced_by_a_symlink_even_inside_library() {
    let (dir, mut store, _, _) = fixture();
    let fingerprint = preview_migration(dir.path(), None).unwrap().fingerprint;
    store.prepare_migration(&fingerprint, None, None).unwrap();
    let original = std::fs::read(dir.path().join("a-card.md")).unwrap();
    std::fs::rename(dir.path().join("a-card.md"), dir.path().join("other.md")).unwrap();
    std::os::unix::fs::symlink("other.md", dir.path().join("a-card.md")).unwrap();
    assert!(store.resume_migration(10).is_err());
    assert_eq!(
        std::fs::read(dir.path().join("other.md")).unwrap(),
        original
    );
}

#[test]
fn invalid_batches_and_corrupt_checkpoints_never_advance_import() {
    let (dir, mut store, fingerprint, original) = fixture();
    assert!(store.resume_migration(1).is_err());
    store.prepare_migration(&fingerprint, None, None).unwrap();
    assert!(store.resume_migration(0).is_err());
    assert!(store.resume_migration(251).is_err());
    store
        .conn
        .execute(
            "UPDATE library_metadata SET value_json='{}' WHERE key='migrationPlan'",
            [],
        )
        .unwrap();
    assert!(store.resume_migration(1).is_err());
    assert_eq!(
        std::fs::read_to_string(dir.path().join("a-card.md")).unwrap(),
        original
    );
    assert!(store.list_cards(None, true).unwrap().is_empty());
}

#[test]
fn new_source_files_and_ambiguous_history_are_visible_without_inventing_data() {
    let (dir, mut store, fingerprint, _) = fixture();
    store.prepare_migration(&fingerprint, None, None).unwrap();
    std::fs::write(dir.path().join("unexpected.md"), "new user content").unwrap();
    assert!(store.resume_migration(100).is_err());
    assert_eq!(store.migration_state().unwrap(), MigrationState::Migrating);
    assert_eq!(
        std::fs::read_to_string(dir.path().join("unexpected.md")).unwrap(),
        "new user content"
    );
}

#[test]
fn preview_reports_unassignable_history_and_rejects_a_foreign_recovery_map() {
    let (dir, _store, _, _) = fixture();
    let log = tempfile::NamedTempFile::new().unwrap();
    let valid = json!({"ts":1700000000_i64,"note_path":dir.path().join("a-card.md"),"rating":3,"state_before":"review","scheduled_days":14}).to_string();
    let relative = json!({"ts":1700000000_i64,"note_path":"a-card.md","rating":3,"state_before":"review","scheduled_days":14}).to_string();
    std::fs::write(log.path(), format!("{valid}\n{relative}\nnot json\n")).unwrap();
    let preview = preview_migration(dir.path(), Some(log.path())).unwrap();
    assert_eq!(preview.review_count, 1);
    assert_eq!(preview.unassigned_review_count, 2);
    assert!(preview
        .issues
        .iter()
        .any(|issue| issue.code == "unassignedReviews"));
    std::fs::write(dir.path().join(".memnova/legacy-review-map.json"),json!({"formatVersion":1,"libraryId":uuid::Uuid::new_v4().to_string(),"reviews":[],"invalid":0,"unscoped":0}).to_string()).unwrap();
    assert!(preview_migration(dir.path(), None).is_err());
}

#[test]
fn conflicting_history_identity_never_silently_discards_the_original_row() {
    let (dir, mut store, _, _) = fixture();
    let log = tempfile::NamedTempFile::new().unwrap();
    let row = json!({"ts":1700000000_i64,"note_path":dir.path().join("a-card.md"),"rating":3,"state_before":"review","scheduled_days":14}).to_string();
    std::fs::write(log.path(), format!("{row}\n")).unwrap();
    let preview = preview_migration(dir.path(), Some(log.path())).unwrap();
    store
        .prepare_migration(&preview.fingerprint, None, Some(log.path()))
        .unwrap();
    store.resume_migration(1).unwrap();
    let plan = store.load_migration_plan().unwrap();
    let card = store.list_cards(None, true).unwrap().remove(0);
    let id = &plan.reviews[0].id;
    store.conn.execute("INSERT INTO reviews(id,card_id,rating,reviewed_at,engine) VALUES(?1,?2,1,1,'legacy-fsrs5')",(id,&card.id)).unwrap();
    assert!(store.resume_migration(100).is_err());
    assert_eq!(store.migration_state().unwrap(), MigrationState::Migrating);
    assert_eq!(
        store
            .conn
            .query_row("SELECT rating FROM reviews WHERE id=?1", [id], |row| row
                .get::<_, u8>(0))
            .unwrap(),
        1
    );
}
