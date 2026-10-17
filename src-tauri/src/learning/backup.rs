use super::{
    backup_files::{
        checked_source, copy_file, directories, fingerprint, inventory, relative_path, SnapshotFile,
    },
    identity::{read_library_identity, reject_symlink},
    Store,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupDescriptor {
    pub id: String,
    pub library_id: String,
    pub created_at: i64,
    pub file_count: usize,
    pub bytes: u64,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Manifest {
    format_version: u32,
    #[serde(flatten)]
    description: BackupDescriptor,
    files: Vec<SnapshotFile>,
    directories: Vec<String>,
}

fn verify_database(path: &Path) -> Result<(), String> {
    let conn =
        rusqlite::Connection::open_with_flags(path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|e| e.to_string())?;
    let check: String = conn
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let version: u32 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let mut violations = conn
        .prepare("PRAGMA foreign_key_check")
        .map_err(|e| e.to_string())?;
    let invalid = violations.exists([]).map_err(|e| e.to_string())?;
    if check != "ok" || version != 1 || invalid {
        return Err("Backup database failed integrity or version checks".into());
    }
    Ok(())
}

impl Store {
    pub fn verify_backup(&self, id: &str) -> Result<BackupDescriptor, String> {
        self.verified_backup(id)
            .map(|(manifest, _)| manifest.description)
    }

    pub fn restore_local_backup(&self, id: &str) -> Result<PathBuf, String> {
        let directory = self.root.join(".memnova/restores");
        reject_symlink(&self.root.join(".memnova"))?;
        reject_symlink(&directory)?;
        fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
        let target = directory.join(uuid::Uuid::new_v4().to_string());
        self.restore_backup(id, &target)?;
        Ok(target)
    }

    fn backups_directory(&self) -> Result<PathBuf, String> {
        reject_symlink(&self.root.join(".memnova"))?;
        let path = self.root.join(".memnova/backups");
        reject_symlink(&path)?;
        Ok(path)
    }

    pub fn create_backup(&self) -> Result<BackupDescriptor, String> {
        let original = inventory(&self.root, true)?;
        let original_directories = directories(&self.root)?;
        let version: i64 = self
            .conn
            .query_row("PRAGMA data_version", [], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        let directory = self.backups_directory()?;
        fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
        let staged = tempfile::Builder::new()
            .prefix(".backup-")
            .tempdir_in(&directory)
            .map_err(|e| e.to_string())?;
        let files = staged.path().join("files");
        for directory in &original_directories {
            fs::create_dir_all(files.join(relative_path(directory)?)).map_err(|e| e.to_string())?;
        }
        copy_learning_snapshot(&self.conn, &self.root, &files)?;
        for file in &original {
            copy_file(
                &checked_source(&self.root, &file.path)?,
                &files.join(relative_path(&file.path)?),
            )?;
        }
        let final_version: i64 = self
            .conn
            .query_row("PRAGMA data_version", [], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        if version != final_version
            || original != inventory(&self.root, true)?
            || original_directories != directories(&self.root)?
        {
            return Err("Library changed during backup; retry after saving".into());
        }
        verify_library_identity(&files, &self.library_id)?;
        verify_database(&files.join(".memnova/learning.sqlite3"))?;
        let inventory = inventory(&files, false)?;
        let description = BackupDescriptor {
            id: uuid::Uuid::new_v4().to_string(),
            library_id: self.library_id.clone(),
            created_at: chrono::Utc::now().timestamp_millis(),
            file_count: inventory.len(),
            bytes: inventory.iter().map(|file| file.bytes).sum(),
        };
        let manifest = Manifest {
            format_version: 1,
            description: description.clone(),
            files: inventory,
            directories: original_directories,
        };
        write_manifest(&staged.path().join("backup.json"), &manifest)?;
        fs::rename(staged.path(), directory.join(&description.id)).map_err(|e| e.to_string())?;
        Ok(description)
    }

    fn verified_backup(&self, id: &str) -> Result<(Manifest, PathBuf), String> {
        uuid::Uuid::parse_str(id).map_err(|_| "Invalid backup identity")?;
        let directory = self.backups_directory()?.join(id);
        reject_symlink(&directory)?;
        let path = checked_source(&directory, "backup.json")?;
        let manifest: Manifest =
            serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;
        if manifest.format_version != 1
            || manifest.description.id != id
            || manifest.description.library_id != self.library_id
            || manifest.description.file_count != manifest.files.len()
        {
            return Err("Backup manifest does not match this Library".into());
        }
        let root = directory.join("files");
        reject_symlink(&root)?;
        verify_directories(&root, &manifest.directories)?;
        verify_files(&root, &manifest.files)?;
        verify_library_identity(&root, &self.library_id)?;
        verify_database(&root.join(".memnova/learning.sqlite3"))?;
        Ok((manifest, root))
    }

    pub fn restore_backup(&self, id: &str, target: &Path) -> Result<(), String> {
        if target.exists() || target.symlink_metadata().is_ok() {
            return Err("Restore requires a new directory; existing data is never replaced".into());
        }
        let (manifest, source) = self.verified_backup(id)?;
        let parent = target
            .parent()
            .ok_or("Restore target needs a parent directory")?;
        let staged = tempfile::Builder::new()
            .prefix(".restore-")
            .tempdir_in(parent)
            .map_err(|e| e.to_string())?;
        for directory in &manifest.directories {
            fs::create_dir_all(staged.path().join(relative_path(directory)?))
                .map_err(|e| e.to_string())?;
        }
        for file in &manifest.files {
            let destination = staged.path().join(relative_path(&file.path)?);
            copy_file(&checked_source(&source, &file.path)?, &destination)?;
            if fingerprint(&destination, &file.path)? != *file {
                return Err("Restored file checksum verification failed".into());
            }
        }
        verify_database(&staged.path().join(".memnova/learning.sqlite3"))?;
        fs::rename(staged.path(), target).map_err(|e| e.to_string())
    }
}

fn verify_library_identity(root: &Path, expected: &str) -> Result<(), String> {
    if read_library_identity(&root.join(".memnova"))? != expected {
        return Err("Backup Library identity does not match its manifest".into());
    }
    Ok(())
}

fn verify_directories(root: &Path, directories: &[String]) -> Result<(), String> {
    for directory in directories {
        relative_path(directory)?;
        if directory.split('/').next() == Some(".memnova")
            || directory.starts_with(".git/")
            || directory == ".git"
        {
            return Err("Unexpected backup directory".into());
        }
        let source = root.join(directory);
        reject_symlink(&source)?;
        if !source.is_dir() {
            return Err("Backup directory is missing".into());
        }
    }
    Ok(())
}

fn verify_files(root: &Path, files: &[SnapshotFile]) -> Result<(), String> {
    let mut seen = HashSet::new();
    for file in files {
        relative_path(&file.path)?;
        if file.path.starts_with(".git/") || file.path == ".git" {
            return Err("Git internals are not part of learning backups".into());
        }
        if !seen.insert(file.path.as_str()) {
            return Err("Backup has duplicate paths".into());
        }
        if file.path.starts_with(".memnova/")
            && ![".memnova/library.json", ".memnova/learning.sqlite3"].contains(&file.path.as_str())
        {
            return Err("Unexpected Library metadata in backup".into());
        }
        let source = checked_source(root, &file.path)?;
        if fingerprint(&source, &file.path)? != *file {
            return Err("Backup checksum verification failed".into());
        }
    }
    if !seen.contains(".memnova/library.json") || !seen.contains(".memnova/learning.sqlite3") {
        return Err("Backup is missing learning data".into());
    }
    Ok(())
}

fn write_manifest(path: &Path, manifest: &Manifest) -> Result<(), String> {
    let mut output = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|e| e.to_string())?;
    use std::io::Write;
    output
        .write_all(&serde_json::to_vec_pretty(manifest).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    output.sync_all().map_err(|e| e.to_string())?;
    Ok(())
}

fn copy_learning_snapshot(
    connection: &rusqlite::Connection,
    root: &Path,
    files: &Path,
) -> Result<(), String> {
    fs::create_dir_all(files.join(".memnova")).map_err(|e| e.to_string())?;
    connection
        .backup("main", files.join(".memnova/learning.sqlite3"), None)
        .map_err(|e| e.to_string())?;
    // The online snapshot can inherit WAL mode. Convert only this detached
    // copy to a standalone file before hashing, never copy a live WAL/SHM.
    let snapshot = rusqlite::Connection::open(files.join(".memnova/learning.sqlite3"))
        .map_err(|e| e.to_string())?;
    snapshot
        .pragma_update(None, "journal_mode", "DELETE")
        .map_err(|e| e.to_string())?;
    drop(snapshot);
    copy_file(
        &root.join(".memnova/library.json"),
        &files.join(".memnova/library.json"),
    )?;
    Ok(())
}
