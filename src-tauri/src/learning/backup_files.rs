use super::identity::reject_symlink;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Read, Write},
    path::{Component, Path, PathBuf},
};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(super) struct SnapshotFile {
    pub path: String,
    pub bytes: u64,
    pub sha256: String,
}

pub(super) fn relative_path(value: &str) -> Result<&Path, String> {
    let path = Path::new(value);
    if value.is_empty()
        || value.contains('\\')
        || path
            .components()
            .any(|part| !matches!(part, Component::Normal(_)))
    {
        return Err("Unsafe backup path".into());
    }
    Ok(path)
}

pub(super) fn fingerprint(path: &Path, relative: &str) -> Result<SnapshotFile, String> {
    reject_symlink(path)?;
    let mut source = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut bytes = 0;
    let mut buffer = [0_u8; 32768];
    loop {
        let count = source.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
        bytes += count as u64;
    }
    Ok(SnapshotFile {
        path: relative.into(),
        bytes,
        sha256: format!("{:x}", hasher.finalize()),
    })
}

pub(super) fn inventory(root: &Path, exclude_internal: bool) -> Result<Vec<SnapshotFile>, String> {
    let mut files = Vec::new();
    let walk = walk_library(root, exclude_internal);
    for entry in walk {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.file_type().is_dir() {
            continue;
        }
        if !entry.file_type().is_file() {
            return Err("Backup requires regular files; symbolic links are not followed".into());
        }
        let relative = entry
            .path()
            .strip_prefix(root)
            .map_err(|e| e.to_string())?
            .to_str()
            .ok_or("Backup filenames must be UTF-8")?
            .replace(std::path::MAIN_SEPARATOR, "/");
        relative_path(&relative)?;
        files.push(fingerprint(entry.path(), &relative)?);
    }
    files.sort_by(|left, right| left.path.cmp(&right.path));
    Ok(files)
}

pub(super) fn copy_file(source: &Path, target: &Path) -> Result<(), String> {
    reject_symlink(source)?;
    let parent = target.parent().ok_or("Backup target has no parent")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let mut input = fs::File::open(source).map_err(|e| e.to_string())?;
    let mut output = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(target)
        .map_err(|e| e.to_string())?;
    std::io::copy(&mut input, &mut output).map_err(|e| e.to_string())?;
    output.flush().map_err(|e| e.to_string())?;
    output.sync_all().map_err(|e| e.to_string())
}

pub(super) fn checked_source(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let path = root.join(relative_path(relative)?);
    reject_symlink(&path)?;
    let canonical = path.canonicalize().map_err(|e| e.to_string())?;
    let canonical_root = root.canonicalize().map_err(|e| e.to_string())?;
    if !canonical.starts_with(canonical_root) || !canonical.is_file() {
        return Err("Backup file escaped its directory".into());
    }
    Ok(path)
}

fn walk_library(
    root: &Path,
    exclude_internal: bool,
) -> impl Iterator<Item = Result<walkdir::DirEntry, walkdir::Error>> + '_ {
    walkdir::WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(move |entry| {
            entry.depth() != 1
                || !exclude_internal
                || ![".git", ".memnova"]
                    .iter()
                    .any(|name| entry.file_name() == *name)
        })
}

pub(super) fn directories(root: &Path) -> Result<Vec<String>, String> {
    let mut result = Vec::new();
    for entry in walk_library(root, true) {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.depth() == 0 || !entry.file_type().is_dir() {
            continue;
        }
        let relative = entry
            .path()
            .strip_prefix(root)
            .map_err(|e| e.to_string())?
            .to_str()
            .ok_or("Backup filenames must be UTF-8")?
            .replace(std::path::MAIN_SEPARATOR, "/");
        relative_path(&relative)?;
        result.push(relative);
    }
    result.sort();
    Ok(result)
}
