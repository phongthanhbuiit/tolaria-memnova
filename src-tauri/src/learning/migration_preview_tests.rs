use super::backup_files::inventory;
use super::migration_preview::preview_migration;

#[test]
fn preview_is_read_only_and_reports_legacy_card_states_without_rescheduling() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(
        dir.path().join("lesson.md"),
        "# Bài học\r\n\r\nNội dung trang.\r\n",
    )
    .unwrap();
    std::fs::write(dir.path().join("review.md"), "---\n_fsrs_enabled: true\n_fsrs_state: review\n_fsrs_due: '2027-01-04T10:30:00+07:00'\n_fsrs_stability: 19.25\n_fsrs_difficulty: 4.75\n_fsrs_elapsed_days: 8\n_fsrs_scheduled_days: 25\n_fsrs_reps: 41\n_fsrs_lapses: 3\n_fsrs_last_review: '2026-12-10T10:30:00+07:00'\nIPA: '/test/'\naudio: 'attachments/audio.mp3'\n---\n# Question\n\n<!-- FLASHCARD:BACK -->\n\n    indented answer\n").unwrap();
    std::fs::write(
        dir.path().join("mental.md"),
        "---\n_fsrs_enabled: true\n---\n# Recall this lesson\n\nEntire lesson remains here.\n",
    )
    .unwrap();
    std::fs::write(
        dir.path().join("draft.md"),
        "# Draft question\n\n<!-- FLASHCARD:BACK -->\n",
    )
    .unwrap();
    let before = inventory(dir.path(), false).unwrap();
    let preview = preview_migration(dir.path(), None).unwrap();
    assert_eq!(preview.page_count, 4);
    assert_eq!(preview.card_count, 3);
    assert_eq!(preview.active_cards, 2);
    assert_eq!(preview.draft_cards, 1);
    assert_eq!(preview.whole_page_cards, 1);
    let reviewed = preview
        .pages
        .iter()
        .find(|page| page.path == "review.md")
        .unwrap()
        .card
        .as_ref()
        .unwrap();
    assert_eq!(reviewed.schedule.due, "2027-01-04T10:30:00+07:00");
    assert_eq!(reviewed.schedule.reps, 41);
    assert_eq!(reviewed.schedule.lapses, 3);
    assert_eq!(reviewed.schedule.stability, 19.25);
    assert_eq!(reviewed.schedule.difficulty, 4.75);
    assert_eq!(reviewed.draft.properties["IPA"], "/test/");
    assert_eq!(reviewed.draft.properties["audio"], "attachments/audio.mp3");
    assert_eq!(reviewed.draft.back, "    indented answer\n");
    assert!(!preview.issues.iter().any(|issue| issue.severity == "error"));
    assert_eq!(inventory(dir.path(), false).unwrap(), before);
    assert!(!dir.path().join(".memnova").exists());
}

#[test]
fn invalid_schedules_and_duplicate_page_ids_are_reported_without_repairing_source() {
    let dir = tempfile::tempdir().unwrap();
    let id = uuid::Uuid::new_v4().to_string();
    for name in ["first.md", "second.md"] {
        std::fs::write(dir.path().join(name), format!("---\n_memnova_page_id: {id}\n_fsrs_enabled: true\n_fsrs_state: review\n_fsrs_due: yesterday\n_fsrs_reps: -3\n---\n# Original\n")).unwrap();
    }
    let before = inventory(dir.path(), false).unwrap();
    let preview = preview_migration(dir.path(), None).unwrap();
    assert!(preview
        .issues
        .iter()
        .any(|issue| issue.code == "duplicatePageId"));
    assert!(preview
        .issues
        .iter()
        .any(|issue| issue.code == "invalidSchedule"));
    assert_eq!(inventory(dir.path(), false).unwrap(), before);
}

#[test]
fn fingerprint_is_stable_and_changes_when_source_bytes_change() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("lesson.md");
    std::fs::write(&path, "# Lesson\n").unwrap();
    let initial = preview_migration(dir.path(), None).unwrap();
    assert_eq!(
        preview_migration(dir.path(), None).unwrap().fingerprint,
        initial.fingerprint
    );
    std::fs::write(path, "# Lesson\n\n").unwrap();
    assert_ne!(
        preview_migration(dir.path(), None).unwrap().fingerprint,
        initial.fingerprint
    );
}

#[test]
fn unreadable_or_malformed_markdown_is_reported_instead_of_silently_skipped() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("invalid.md"), [255_u8, 0]).unwrap();
    std::fs::write(
        dir.path().join("yaml.md"),
        "---\n_fsrs_enabled: true\ninvalid: [\n---\n# Original",
    )
    .unwrap();
    let preview = preview_migration(dir.path(), None).unwrap();
    assert!(preview
        .issues
        .iter()
        .any(|issue| issue.path == "invalid.md" && issue.severity == "error"));
    assert!(preview
        .issues
        .iter()
        .any(|issue| issue.path == "yaml.md" && issue.severity == "error"));
}

#[cfg(unix)]
#[test]
fn preview_does_not_follow_external_symlinks_or_count_hidden_backup_notes() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::create_dir_all(dir.path().join(".memnova/backups/old")).unwrap();
    std::fs::write(
        dir.path().join(".memnova/backups/old/copy.md"),
        "# Hidden backup",
    )
    .unwrap();
    std::fs::write(dir.path().join("lesson.md"), "# Lesson").unwrap();
    let outside = tempfile::tempdir().unwrap();
    std::fs::write(outside.path().join("private.md"), "PRIVATE OUTSIDE CONTENT").unwrap();
    std::os::unix::fs::symlink(outside.path(), dir.path().join("linked")).unwrap();
    let preview = preview_migration(dir.path(), None).unwrap();
    assert_eq!(preview.page_count, 1);
    assert!(preview
        .issues
        .iter()
        .any(|issue| issue.code == "unsafeLink"));
    assert!(!serde_json::to_string(&preview)
        .unwrap()
        .contains("PRIVATE OUTSIDE CONTENT"));
}

#[test]
fn disabled_cards_remain_suspended_and_nested_metadata_is_retained() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("card.md"), "---\n_fsrs_enabled: false\n_fsrs_state: review\n_fsrs_due: '2027-01-01T00:00:00Z'\n_fsrs_reps: '12'\n_fsrs_stability: '7.5'\n_fsrs_difficulty: 4\ncustom:\n  tags: [one, two]\n---\n# **Câu hỏi**\n\n<!-- FLASHCARD:BACK -->\n\nAnswer\n").unwrap();
    let preview = preview_migration(dir.path(), None).unwrap();
    let page = &preview.pages[0];
    assert_eq!(page.title, "Câu hỏi");
    let card = page.card.as_ref().unwrap();
    assert_eq!(card.draft.status, "suspended");
    assert_eq!(card.schedule.reps, 12);
    assert_eq!(card.schedule.stability, 7.5);
    assert_eq!(card.draft.properties["custom"]["tags"][1], "two");
    assert_eq!(preview.suspended_cards, 1);
}

#[test]
fn duplicate_frontmatter_keys_are_not_silently_overwritten() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(
        dir.path().join("card.md"),
        "---\n_fsrs_enabled: true\n_fsrs_enabled: false\n---\n# Original\n",
    )
    .unwrap();
    let preview = preview_migration(dir.path(), None).unwrap();
    assert!(preview
        .issues
        .iter()
        .any(|issue| issue.code == "invalidFrontmatter"));
}

#[test]
fn invalid_numeric_schedule_values_are_reported_without_defaulting_them_to_zero() {
    let dir = tempfile::tempdir().unwrap();
    for (index, value) in ["-1", ".nan", "1.5", "4294967296", "not-a-number"]
        .iter()
        .enumerate()
    {
        std::fs::write(
            dir.path().join(format!("{index}.md")),
            format!("---\n_fsrs_enabled: true\n_fsrs_reps: {value}\n---\n# Original\n"),
        )
        .unwrap();
    }
    let preview = preview_migration(dir.path(), None).unwrap();
    assert_eq!(
        preview
            .issues
            .iter()
            .filter(|issue| issue.code == "invalidSchedule")
            .count(),
        5
    );
}

#[test]
fn partial_disabled_schedules_are_not_omitted_from_the_preview() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("card.md"), "---\n_fsrs_enabled: false\n_fsrs_elapsed_days: 8\n_fsrs_scheduled_days: 13\n---\n# Original\n").unwrap();
    let preview = preview_migration(dir.path(), None).unwrap();
    assert_eq!(preview.suspended_cards, 1);
    let card = preview.pages[0].card.as_ref().unwrap();
    assert_eq!(card.schedule.elapsed_days, 8.0);
    assert_eq!(card.schedule.scheduled_days, 13.0);
}
