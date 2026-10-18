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
    let encoded = format!(
        "![hint](asset://localhost/{})",
        file.path().replace('/', "%2F")
    );
    assert_eq!(
        media.collect(&root, "article.md", &encoded).unwrap()[0].sha256,
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
#[test]
fn portable_canvas_asset_uri_resolves_identical_bytes_after_restoring_to_a_new_root() {
    let original = tempfile::tempdir().unwrap();
    let restored = tempfile::tempdir().unwrap();
    for directory in [&original, &restored] {
        fs::create_dir(directory.path().join("attachments")).unwrap();
        fs::write(
            directory.path().join("attachments/ảnh nhớ.png"),
            b"portable image bytes",
        )
        .unwrap();
    }
    let source = "```tldraw\n{\"store\":{\"asset:one\":{\"typeName\":\"asset\",\"props\":{\"src\":\"asset://memnova/attachments/%E1%BA%A3nh%20nh%E1%BB%9B.png\"}},\"shape:one\":{\"typeName\":\"shape\",\"type\":\"image\",\"props\":{\"assetId\":\"asset:one\"}}}}\n```";
    let first = MediaSnapshot::default()
        .collect(
            &original.path().canonicalize().unwrap(),
            "lessons/article.md",
            source,
        )
        .unwrap();
    let second = MediaSnapshot::default()
        .collect(
            &restored.path().canonicalize().unwrap(),
            "moved/article.md",
            source,
        )
        .unwrap();
    assert_eq!(first, second);
    assert_eq!(first[0].path, "attachments/ảnh nhớ.png");
    assert_eq!(first[0].bytes, 20);
}
#[test]
fn portable_canvas_asset_uri_rejects_private_traversal_authority_and_encoded_separator() {
    let directory = tempfile::tempdir().unwrap();
    let root = directory.path().canonicalize().unwrap();
    for source in [
        "asset://memnova/.memnova/learning.sqlite3",
        "asset://memnova/attachments/../../outside.png",
        "asset://memnova/attachments/%2foutside.png",
        "asset://user@memnova/attachments/x.png",
        "asset://memnova:123/attachments/x.png",
        "asset://memnova/attachments/x.png?redirect=other",
        "asset://memnova/attachments/x.png#other",
    ] {
        let body = format!("![image]({source})");
        assert!(
            MediaSnapshot::default()
                .collect(&root, "owner.md", &body)
                .is_err(),
            "{source}"
        );
    }
}

#[test]
fn m22_media_examples_in_indented_code_are_not_required_assets_but_list_images_remain_live() {
    for (source, expected) in [
        (
            "    ![code](missing.png)\n\t![tabbed](also-missing.png)\n",
            vec![],
        ),
        (
            "Paragraph\n    ![continuation](live.png)\n",
            vec!["live.png"],
        ),
        ("- Item\n\n    ![list](live.png)\n", vec!["live.png"]),
        ("- Item\n\n      ![list code](missing.png)\n", vec![]),
        ("```txt\nliteral\n```\n    ![code](missing.png)\n", vec![]),
    ] {
        assert_eq!(media_sources(source).unwrap(), expected, "{source}");
    }
}
