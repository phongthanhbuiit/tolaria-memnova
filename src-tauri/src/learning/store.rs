use super::identity::{library_identity, reject_symlink};
use rusqlite::{Connection, OptionalExtension};
use std::{
    path::{Component, Path, PathBuf},
    time::Duration,
};

pub struct Store {
    pub(super) conn: Connection,
    pub library_id: String,
    pub(super) root: PathBuf,
}

impl Store {
    pub fn open(root: &Path) -> Result<Self, String> {
        let root = root.canonicalize().map_err(|e| e.to_string())?;
        let directory = root.join(".memnova");
        let library_id = library_identity(&directory)?;
        let path = directory.join("learning.sqlite3");
        for suffix in ["", "-wal", "-shm"] {
            reject_symlink(&directory.join(format!("learning.sqlite3{suffix}")))?;
        }
        let mut conn = Connection::open(path).map_err(|e| e.to_string())?;
        conn.busy_timeout(Duration::from_secs(5))
            .map_err(|e| e.to_string())?;
        let version: u32 = conn
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .map_err(|e| e.to_string())?;
        if version > 1 {
            return Err("Learning database was created by a newer Memnova version".into());
        }
        conn.execute_batch(
            "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;",
        )
        .map_err(|e| e.to_string())?;
        if version == 0 {
            let transaction = conn.transaction().map_err(|e| e.to_string())?;
            transaction
                .execute_batch(include_str!("schema.sql"))
                .map_err(|e| e.to_string())?;
            transaction.commit().map_err(|e| e.to_string())?;
        }
        Ok(Self {
            conn,
            library_id,
            root,
        })
    }

    pub fn register_page(&mut self, id: &str, path: &str, title: &str) -> Result<(), String> {
        uuid::Uuid::parse_str(id).map_err(|_| "Invalid page identity")?;
        self.page_path(path)?;
        let transaction = self.conn.transaction().map_err(|e| e.to_string())?;
        let previous: Option<String> = transaction
            .query_row("SELECT path FROM pages WHERE id=?1", [id], |row| row.get(0))
            .optional()
            .map_err(|e| e.to_string())?;
        if previous
            .as_deref()
            .is_some_and(|old| old != path && self.root.join(old).exists())
        {
            return Err("Duplicate page identity: the original page still exists".into());
        }
        transaction.execute("INSERT INTO pages(id,path,title) VALUES(?1,?2,?3) ON CONFLICT(id) DO UPDATE SET path=excluded.path,title=excluded.title,deleted_at=NULL", (id,path,title)).map_err(|e| e.to_string())?;
        transaction.commit().map_err(|e| e.to_string())
    }

    pub(super) fn page_path(&self, relative: &str) -> Result<PathBuf, String> {
        let path = Path::new(relative);
        if path
            .components()
            .any(|part| !matches!(part, Component::Normal(_)))
            || relative.is_empty()
            || relative.contains('\\')
        {
            return Err("Page path must stay inside the library".into());
        }
        if !path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| {
                ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("markdown")
            })
        {
            return Err("A learning page must be a Markdown file".into());
        }
        let absolute = self
            .root
            .join(path)
            .canonicalize()
            .map_err(|e| e.to_string())?;
        if !absolute.starts_with(&self.root) {
            return Err("Page path must stay inside the library".into());
        }
        Ok(absolute)
    }
}
