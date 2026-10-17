use super::{git_command, run_git};
use std::path::Path;

pub(super) const CONTENT_PATHSPEC: &str = ":(icase,glob,exclude)**/.memnova/**";

pub(super) fn is_private(path: &str) -> bool {
    path.split(['/', '\\'])
        .any(|part| part.eq_ignore_ascii_case(".memnova"))
}

pub(super) fn ensure_content_path(path: &str) -> Result<(), String> {
    if is_private(path) {
        Err("Learning data is private; use a verified Library backup instead of Git".into())
    } else {
        Ok(())
    }
}

pub(super) fn ensure_content_index(vault: &Path) -> Result<(), String> {
    let output = git_command()
        .args(["diff", "--cached", "--name-only", "--no-renames", "-z"])
        .current_dir(vault)
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }
    for path in output
        .stdout
        .split(|byte| *byte == 0)
        .filter(|path| !path.is_empty())
    {
        ensure_content_path(&String::from_utf8_lossy(path))?;
    }
    Ok(())
}

pub(super) fn stage_content(vault: &Path) -> Result<(), String> {
    ensure_content_index(vault)?;
    run_git(vault, &["add", "-A", "--", ".", CONTENT_PATHSPEC])
}
