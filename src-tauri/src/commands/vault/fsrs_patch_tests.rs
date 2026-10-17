use super::fsrs_patch::update_fsrs_schedule;
use crate::frontmatter::FrontmatterValue;
use std::collections::BTreeMap;

#[test]
fn persists_all_schedule_fields_and_preserves_markdown() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("lesson.md");
    let body = "# Bài học\n\nMột nội dung **quan trọng**.\n";
    std::fs::write(&path, body).unwrap();
    let patch = BTreeMap::from([
        ("_fsrs_reps".into(), FrontmatterValue::Number(8.0)),
        (
            "_fsrs_state".into(),
            FrontmatterValue::String("review".into()),
        ),
        (
            "_fsrs_due".into(),
            FrontmatterValue::String("2026-10-18T12:00:00Z".into()),
        ),
    ]);
    let content = update_fsrs_schedule(
        path.to_string_lossy().into_owned(),
        patch,
        Some(dir.path().to_string_lossy().into_owned()),
    )
    .unwrap();
    assert!(content.ends_with(body));
    assert!(content.contains("_fsrs_reps: 8"));
    assert!(content.contains("_fsrs_state: review"));
    assert!(content.contains("2026-10-18T12:00:00Z"));
    assert_eq!(std::fs::read_to_string(&path).unwrap(), content);
    assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 1);
}

#[test]
fn rejects_invalid_patch_without_partial_writes() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("lesson.md");
    std::fs::write(&path, "# Original\n").unwrap();
    let patch = BTreeMap::from([
        ("_fsrs_reps".into(), FrontmatterValue::Number(8.0)),
        ("title".into(), FrontmatterValue::String("Replaced".into())),
    ]);
    assert!(update_fsrs_schedule(
        path.to_string_lossy().into_owned(),
        patch,
        Some(dir.path().to_string_lossy().into_owned())
    )
    .is_err());
    assert_eq!(std::fs::read_to_string(&path).unwrap(), "# Original\n");
}

#[test]
fn rejects_outside_library_and_non_markdown_files() {
    let dir = tempfile::tempdir().unwrap();
    let outside = tempfile::tempdir().unwrap();
    for path in [
        outside.path().join("lesson.md"),
        dir.path().join("asset.png"),
    ] {
        std::fs::write(&path, "original").unwrap();
        let patch = BTreeMap::from([("_fsrs_enabled".into(), FrontmatterValue::Bool(true))]);
        assert!(update_fsrs_schedule(
            path.to_string_lossy().into_owned(),
            patch,
            Some(dir.path().to_string_lossy().into_owned())
        )
        .is_err());
        assert_eq!(std::fs::read_to_string(path).unwrap(), "original");
    }
}
