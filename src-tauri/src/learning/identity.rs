use serde::{Deserialize, Serialize};
use std::{fs, fs::OpenOptions, io::Write, path::Path};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Manifest {
    format_version: u32,
    library_id: String,
}

pub(super) fn reject_symlink(path: &Path) -> Result<(), String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            Err("Library metadata cannot be a symbolic link".into())
        }
        Ok(_) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

pub(super) fn library_identity(directory: &Path) -> Result<String, String> {
    reject_symlink(directory)?;
    fs::create_dir_all(directory).map_err(|e| e.to_string())?;
    protect_learning_data_from_git(directory)?;
    let path = directory.join("library.json");
    reject_symlink(&path)?;
    if !path.exists() {
        let manifest = Manifest {
            format_version: 1,
            library_id: uuid::Uuid::new_v4().to_string(),
        };
        let mut staged = tempfile::NamedTempFile::new_in(directory).map_err(|e| e.to_string())?;
        staged
            .write_all(&serde_json::to_vec_pretty(&manifest).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        staged.as_file().sync_all().map_err(|e| e.to_string())?;
        if let Err(error) = staged.persist_noclobber(&path) {
            if error.error.kind() != std::io::ErrorKind::AlreadyExists {
                return Err(error.to_string());
            }
        }
    }
    let manifest: Manifest = serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    if manifest.format_version != 1 {
        return Err("Library manifest uses a newer or unsupported format".into());
    }
    uuid::Uuid::parse_str(&manifest.library_id).map_err(|_| "Invalid library identity")?;
    Ok(manifest.library_id)
}

fn protect_learning_data_from_git(directory: &Path) -> Result<(), String> {
    let path = directory.join(".gitignore");
    reject_symlink(&path)?;
    match OpenOptions::new().write(true).create_new(true).open(path) {
        Ok(mut file) => {
            file.write_all(b"*\n").map_err(|e| e.to_string())?;
            file.sync_all().map_err(|e| e.to_string())
        }
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}
