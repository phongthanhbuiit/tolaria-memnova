use super::{identity::reject_symlink, note_memory::media_sources};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    io::Read,
    path::{Component, Path, PathBuf},
};

const MAX_MEDIA_BYTES: u64 = 256 * 1024 * 1024;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteMediaDependency {
    pub url: String,
    pub path: String,
    pub sha256: String,
    pub bytes: u64,
}
#[derive(Default)]
pub(super) struct MediaSnapshot {
    files: BTreeMap<PathBuf, (String, u64)>,
    bytes: u64,
}

fn absolute_source(root: &Path, owner: &str, raw: &str) -> Result<Option<PathBuf>, String> {
    if raw.starts_with("data:") {
        return Ok(None);
    }
    if Path::new(raw).is_absolute() {
        return Ok(Some(PathBuf::from(raw)));
    }
    match tauri::Url::parse(raw) {
        Ok(url) => url_source(&url),
        Err(_) => {
            let base = if raw.starts_with("attachments/") {
                root.to_path_buf()
            } else {
                root.join(owner)
                    .parent()
                    .ok_or("invalid-media-base")?
                    .to_path_buf()
            };
            Ok(Some(
                tauri::Url::from_directory_path(base)
                    .map_err(|_| "invalid-media-base")?
                    .join(raw)
                    .map_err(|_| "invalid-media-path")?
                    .to_file_path()
                    .map_err(|_| "invalid-media-path")?,
            ))
        }
    }
}
fn url_source(url: &tauri::Url) -> Result<Option<PathBuf>, String> {
    {
        if url.scheme() == "asset" && url.host_str().is_some_and(|host| host != "localhost") {
            return Err("foreign-asset-authority".into());
        }
        if url.host_str() == Some("asset.localhost") && url.port().is_some() {
            return Err("foreign-asset-authority".into());
        }
        if url.scheme() == "data" {
            return Ok(None);
        }
    }
    match url.scheme() {
        "asset" => Ok(Some(asset_path(url)?)),
        "http" | "https" if url.host_str() == Some("asset.localhost") => Ok(Some(asset_path(url)?)),
        "http" | "https" | "data" => Ok(None),
        "file" => url
            .to_file_path()
            .map(Some)
            .map_err(|_| "invalid-media-path".into()),
        _ => Err("unsupported-media-source".into()),
    }
}
fn asset_path(url: &tauri::Url) -> Result<PathBuf, String> {
    tauri::Url::parse(&format!("file://{}", url.path()))
        .map_err(|_| "invalid-media-path")?
        .to_file_path()
        .map_err(|_| "invalid-media-path".into())
}

fn library_relative(root: &Path, absolute: &Path) -> Result<PathBuf, String> {
    if let Ok(relative) = absolute.strip_prefix(root) {
        return Ok(relative.to_path_buf());
    }
    for ancestor in absolute.ancestors().skip(1) {
        if ancestor.canonicalize().is_ok_and(|path| path == root) {
            return absolute
                .strip_prefix(ancestor)
                .map(Path::to_path_buf)
                .map_err(|_| "media-outside-library".into());
        }
    }
    Err("media-outside-library".into())
}
fn checked_media(root: &Path, relative: &Path) -> Result<PathBuf, String> {
    let mut absolute = root.to_path_buf();
    for component in relative.components() {
        let Component::Normal(name) = component else {
            return Err("unsafe-media-path".into());
        };
        if [".memnova", ".git"]
            .iter()
            .any(|private| name.to_string_lossy().eq_ignore_ascii_case(private))
        {
            return Err("private-media-path".into());
        }
        absolute.push(name);
        reject_symlink(&absolute)?;
    }
    let canonical = absolute.canonicalize().map_err(|_| "missing-local-media")?;
    if !canonical.starts_with(root)
        || !fs::metadata(&canonical)
            .map_err(|_| "unreadable-local-media")?
            .is_file()
    {
        return Err("media-outside-library".into());
    }
    Ok(canonical)
}
fn hash_file(path: &Path, budget: u64) -> Result<(String, u64), String> {
    let file = fs::File::open(path).map_err(|_| "unreadable-local-media")?;
    if file.metadata().map_err(|_| "unreadable-local-media")?.len() > budget {
        return Err("media-verification-budget".into());
    }
    let mut reader = file.take(budget.saturating_add(1));
    let mut digest = Sha256::new();
    let mut bytes = 0;
    let mut buffer = [0_u8; 32768];
    loop {
        let count = reader
            .read(&mut buffer)
            .map_err(|_| "unreadable-local-media")?;
        if count == 0 {
            break;
        }
        bytes += count as u64;
        if bytes > budget {
            return Err("media-verification-budget".into());
        }
        digest.update(&buffer[..count]);
    }
    Ok((format!("{:x}", digest.finalize()), bytes))
}
impl MediaSnapshot {
    pub(super) fn collect(
        &mut self,
        root: &Path,
        owner: &str,
        content: &str,
    ) -> Result<Vec<NoteMediaDependency>, String> {
        let mut dependencies = Vec::new();
        for url in media_sources(content)? {
            let Some(absolute) = absolute_source(root, owner, &url)? else {
                continue;
            };
            let relative = library_relative(root, &absolute)?;
            let canonical = checked_media(root, &relative)?;
            if !self.files.contains_key(&canonical) {
                let (digest, bytes) =
                    hash_file(&canonical, MAX_MEDIA_BYTES.saturating_sub(self.bytes))?;
                self.bytes += bytes;
                self.files.insert(canonical.clone(), (digest, bytes));
            }
            let (sha256, bytes) = self
                .files
                .get(&canonical)
                .ok_or("missing-media-fingerprint")?;
            dependencies.push(NoteMediaDependency {
                url,
                path: relative
                    .to_str()
                    .ok_or("invalid-media-filename")?
                    .replace(std::path::MAIN_SEPARATOR, "/"),
                sha256: sha256.clone(),
                bytes: *bytes,
            });
        }
        Ok(dependencies)
    }
}
