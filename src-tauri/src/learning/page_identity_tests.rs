use super::page_identity::with_page_id;

#[test]
fn identity_insertion_preserves_all_existing_frontmatter_lines_and_body_bytes() {
    let id = uuid::Uuid::new_v4().to_string();
    let original = "---\r\n# metadata comment\r\n_fsrs_due: '2027-01-01T00:00:00Z'\ncustom: [one, two]\r\n---\r\n\r\n    indented **bài học**\n\n<!-- FLASHCARD:BACK -->\r\nBack  \r\n";
    let updated = with_page_id(original, &id).unwrap();
    let own_line = format!("_memnova_page_id: {id}\r\n");
    assert!(updated.contains(&own_line));
    assert_eq!(updated.replacen(&own_line, "", 1), original);
}

#[test]
fn bom_and_initial_indentation_stay_in_place() {
    let id = uuid::Uuid::new_v4().to_string();
    for original in [
        "\u{feff}---\nlabel: Original\n---\n# Body\n",
        "\u{feff}\n    indented lesson\r\n",
        "\n    indented lesson\n",
    ] {
        let updated = with_page_id(original, &id).unwrap();
        assert_eq!(
            updated.starts_with('\u{feff}'),
            original.starts_with('\u{feff}')
        );
        if original.contains("label: Original") {
            assert_eq!(
                updated.replacen(&format!("_memnova_page_id: {id}\n"), "", 1),
                original
            );
        } else {
            assert!(updated.ends_with(original.strip_prefix('\u{feff}').unwrap_or(original)));
        }
    }
}

#[test]
fn an_existing_identity_is_idempotent_and_never_reassigned() {
    let id = uuid::Uuid::new_v4().to_string();
    let original = format!("---\n'_memnova_page_id': '{id}' # keep formatting\n---\n# Body\n");
    assert_eq!(with_page_id(&original, &id).unwrap(), original);
    assert!(with_page_id(&original, &uuid::Uuid::new_v4().to_string()).is_err());
    assert!(with_page_id("# Body", "invalid").is_err());
}
