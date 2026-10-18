//! Read preview data from a verified detached copy; even SQLite WAL side files
//! created by read-only connections must never appear in the user's Library.
use super::{
    backup_files::{copy_snapshot_file, fingerprint, SnapshotFile},
    identity::{read_library_identity, reject_symlink},
};
use rusqlite::{Connection, OpenFlags};
use std::path::{Path, PathBuf};

pub(super) struct PreviewStorage {
    pub connection: Option<Connection>,
    _directory: Option<tempfile::TempDir>,
    pub library_id: Option<String>,
    pub schema_version: Option<u32>,
    pub state: String,
    root: PathBuf,
    captured: Vec<SnapshotFile>,
}
fn sqlite_files(root: &Path) -> Result<Vec<SnapshotFile>, String> {
    let mut files = Vec::new();
    for relative in [".memnova/learning.sqlite3", ".memnova/learning.sqlite3-wal"] {
        let path = root.join(relative);
        reject_symlink(&path)?;
        if path.exists() {
            files.push(fingerprint(&path, relative)?);
        }
    }
    Ok(files)
}
impl PreviewStorage {
    pub fn read(root: &Path, expected: Option<&str>) -> Result<Self, String> {
        let metadata = root.join(".memnova");
        reject_symlink(&metadata)?;
        let has_identity = metadata.join("library.json").exists();
        let library_id = if has_identity {
            Some(read_library_identity(&metadata)?)
        } else {
            None
        };
        if expected.is_some() && expected != library_id.as_deref() {
            return Err("library-identity-changed".into());
        }
        let mut snapshot = Self {
            _directory: None,
            connection: None,
            library_id,
            schema_version: None,
            state: "importRequired".into(),
            root: root.into(),
            captured: Vec::new(),
        };
        let db = metadata.join("learning.sqlite3");
        reject_symlink(&db)?;
        if !db.exists() || !has_identity {
            if db.exists() || has_identity {
                snapshot.state = "recoveryRequired".into();
            }
            return Ok(snapshot);
        }
        snapshot.capture_database()?;
        Ok(snapshot)
    }
    fn capture_database(&mut self) -> Result<(), String> {
        reject_symlink(&self.root.join(".memnova/learning.sqlite3-shm"))?;
        self.captured = sqlite_files(&self.root)?;
        let directory = tempfile::tempdir().map_err(|error| error.to_string())?;
        for file in &self.captured {
            copy_snapshot_file(&self.root, directory.path(), file)?;
        }
        self.ensure_unchanged()?;
        let connection = Connection::open_with_flags(
            directory.path().join(".memnova/learning.sqlite3"),
            OpenFlags::SQLITE_OPEN_READ_ONLY,
        )
        .map_err(|error| error.to_string())?;
        let version: u32 = connection
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .map_err(|error| error.to_string())?;
        self.schema_version = Some(version);
        self.state = self.database_state(&connection, version)?;
        self._directory = Some(directory);
        self.connection = Some(connection);
        Ok(())
    }
    fn database_state(&self, connection: &Connection, version: u32) -> Result<String, String> {
        if version == 0 || version > super::SCHEMA_VERSION {
            return Ok("recoveryRequired".into());
        }
        if version >= 2 {
            super::storage_metadata::validate_owner(
                connection,
                self.library_id.as_deref().ok_or("missing-library-id")?,
            )?;
        }
        if version < super::SCHEMA_VERSION {
            return Ok("upgradeRequired".into());
        }
        let state: Option<super::MigrationState> =
            super::storage_metadata::read_metadata(connection, "migrationState")?;
        Ok(if state == Some(super::MigrationState::Ready) {
            "ready"
        } else {
            "importRequired"
        }
        .into())
    }
    pub fn ensure_unchanged(&self) -> Result<(), String> {
        if !self.captured.is_empty() && sqlite_files(&self.root)? != self.captured {
            return Err("preview-storage-changed".into());
        }
        if let Some(id) = &self.library_id {
            if read_library_identity(&self.root.join(".memnova"))? != *id {
                return Err("library-identity-changed".into());
            }
        }
        Ok(())
    }
}
