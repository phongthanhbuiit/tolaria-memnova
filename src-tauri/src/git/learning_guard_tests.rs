use super::tests::setup_git_repo;
use super::{git_command, git_commit, init_repo};
use std::{fs, path::Path};

fn git(vault: &Path, args: &[&str]) -> Vec<u8> {
    let result = git_command()
        .args(args)
        .current_dir(vault)
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    result.stdout
}

#[test]
fn commits_exclude_tracked_learning_data_and_backups() {
    let dir = setup_git_repo();
    let root = dir.path();
    fs::create_dir_all(root.join(".memnova/backups")).unwrap();
    fs::write(root.join(".memnova/learning.sqlite3"), "original database").unwrap();
    fs::write(root.join(".memnova/backups/lesson.md"), "original backup").unwrap();
    git(root, &["add", "-f", ".memnova"]);
    git(
        root,
        &[
            "-c",
            "commit.gpgsign=false",
            "commit",
            "-m",
            "Legacy tracked data",
        ],
    );
    fs::write(root.join(".memnova/learning.sqlite3"), "private progress").unwrap();
    fs::write(root.join(".memnova/backups/lesson.md"), "private backup").unwrap();
    fs::write(root.join("public.md"), "new lesson").unwrap();
    git_commit(root.to_str().unwrap(), "Update lesson").unwrap();
    assert_eq!(
        git(root, &["show", "HEAD:.memnova/learning.sqlite3"]),
        b"original database"
    );
    assert_eq!(
        git(root, &["show", "HEAD:.memnova/backups/lesson.md"]),
        b"original backup"
    );
    assert_eq!(git(root, &["show", "HEAD:public.md"]), b"new lesson");
    assert!(super::get_modified_files(root).unwrap().is_empty());
}

#[test]
fn staged_learning_data_blocks_commit_without_changing_the_index() {
    let dir = setup_git_repo();
    let root = dir.path();
    fs::create_dir(root.join(".memnova")).unwrap();
    fs::write(root.join(".memnova/learning.sqlite3"), "private").unwrap();
    git(root, &["add", "-f", ".memnova"]);
    let before = git(root, &["write-tree"]);
    assert!(git_commit(root.to_str().unwrap(), "Must fail").is_err());
    assert_eq!(git(root, &["write-tree"]), before);
}

#[test]
fn initial_commit_excludes_learning_directories_even_with_custom_gitignore() {
    let dir = tempfile::tempdir().unwrap();
    fs::create_dir_all(dir.path().join("nested/.MEMNOVA/backups")).unwrap();
    fs::write(
        dir.path().join("nested/.MEMNOVA/backups/secret.md"),
        "private",
    )
    .unwrap();
    fs::write(dir.path().join(".gitignore"), "custom-pattern\n").unwrap();
    fs::write(dir.path().join("lesson.md"), "lesson").unwrap();
    init_repo(dir.path()).unwrap();
    let tracked = String::from_utf8(git(dir.path(), &["ls-files"])).unwrap();
    assert!(!tracked.to_lowercase().contains(".memnova"));
    assert!(tracked.contains("lesson.md"));
    assert_eq!(
        fs::read_to_string(dir.path().join(".gitignore")).unwrap(),
        "custom-pattern\n"
    );
}
