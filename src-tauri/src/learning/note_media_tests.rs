use super::{note_media::MediaSnapshot, note_memory::media_sources};
use std::fs;

#[test]
fn media_parser_ignores_literal_fences_inline_code_comments_and_unused_references() {
    let body="![live](<attachments/ảnh (1).png> \"caption\")\n`![code](missing.png)`\n<!--\n```tldraw\n{broken\n```\n![comment](missing.png)\n-->\n````md\n![literal](missing.png)\n````\n![reference][my image]\n[my image]: attachments/ref.png\n[unused]: missing.png\n<audio src=\"attachments/listen.mp3\"></audio>\n[note](other.md)";
    assert_eq!(
        media_sources(body).unwrap(),
        vec![
            "attachments/listen.mp3",
            "attachments/ref.png",
            "attachments/ảnh (1).png"
        ]
    );
}
#[test]
fn local_media_resolves_unicode_relative_base_and_rejects_foreign_asset_authority() {
    let directory = tempfile::tempdir().unwrap();
    let root = directory.path().canonicalize().unwrap();
    fs::create_dir(root.join("attachments")).unwrap();
    fs::create_dir(root.join("notes")).unwrap();
    fs::write(root.join("attachments/ảnh (1).png"), b"fingerprint fixture").unwrap();
    let mut media = MediaSnapshot::default();
    let first = media
        .collect(
            &root,
            "notes/article.md",
            "![hint](<../attachments/ảnh%20(1).png>)",
        )
        .unwrap();
    assert_eq!(first[0].path, "attachments/ảnh (1).png");
    let file = tauri::Url::from_file_path(root.join("attachments/ảnh (1).png")).unwrap();
    let local = format!("![hint](asset://localhost{})", file.path());
    assert_eq!(
        media.collect(&root, "article.md", &local).unwrap()[0].sha256,
        first[0].sha256
    );
    let foreign = format!("![hint](asset://untrusted{})", file.path());
    assert!(media.collect(&root, "article.md", &foreign).is_err());
}
#[test]
fn verification_budget_and_symlinks_fail_without_reading_an_unbounded_media_file() {
    let directory = tempfile::tempdir().unwrap();
    let root = directory.path().canonicalize().unwrap();
    let file = fs::File::create(root.join("large.png")).unwrap();
    file.set_len(257 * 1024 * 1024).unwrap();
    assert!(MediaSnapshot::default()
        .collect(&root, "article.md", "![large](large.png)")
        .unwrap_err()
        .contains("budget"));
    #[cfg(unix)]
    {
        let outside = tempfile::tempdir().unwrap();
        fs::write(outside.path().join("secret.png"), b"outside").unwrap();
        std::os::unix::fs::symlink(outside.path().join("secret.png"), root.join("link.png"))
            .unwrap();
        assert!(MediaSnapshot::default()
            .collect(&root, "article.md", "![link](link.png)")
            .is_err());
    }
}
