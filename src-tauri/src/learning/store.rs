use super::identity::{library_identity, reject_symlink};
use rusqlite::{Connection, OptionalExtension};
use std::{
    path::{Component, Path, PathBuf},
    sync::Mutex,
    time::Duration,
};

static STORE_OPEN: Mutex<()> = Mutex::new(());

pub struct Store {
    pub(super) conn: Connection,
    pub library_id: String,
    pub(super) root: PathBuf,
}

impl Store {
    pub fn open(root: &Path) -> Result<Self, String> {
        let _opening = STORE_OPEN.lock().map_err(|error| error.to_string())?;
        let root = root.canonicalize().map_err(|e| e.to_string())?;
        let directory = root.join(".memnova");
        reject_symlink(&directory)?;
        if directory.join("library.json").exists() && !directory.join("learning.sqlite3").exists() {
            return Err(
                "Learning database is missing; restore a verified Library backup before continuing"
                    .into(),
            );
        }
        let existing_identity = directory.join("library.json").exists();
        if !existing_identity
            && ["", "-wal", "-shm"]
                .iter()
                .any(|suffix| directory.join(format!("learning.sqlite3{suffix}")).exists())
        {
            return Err("Library manifest is missing; restore its original identity from a verified backup before continuing".into());
        }
        let library_id = library_identity(&directory)?;
        for suffix in ["", "-wal", "-shm"] {
            reject_symlink(&directory.join(format!("learning.sqlite3{suffix}")))?;
        }
        let conn = open_owned_database(&root, &library_id, existing_identity)?;
        Ok(Self {
            conn,
            library_id,
            root,
        })
    }

    pub fn register_page(&mut self, id: &str, path: &str, title: &str) -> Result<(), String> {
        uuid::Uuid::parse_str(id).map_err(|_| "Invalid page identity")?;
        self.page_path(path)?;
        let transaction = self
            .conn
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(|e| e.to_string())?;
        register_page_in(&transaction, &self.root, id, path, title)?;
        transaction.commit().map_err(|e| e.to_string())
    }

    pub(super) fn page_path(&self, relative: &str) -> Result<PathBuf, String> {
        checked_page_path(&self.root, relative)
    }
}

pub(super) fn checked_page_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let path = Path::new(relative);
    if path
        .components()
        .any(|part| !matches!(part, Component::Normal(_)))
        || relative.is_empty()
        || relative.contains('\\')
        || path
            .components()
            .any(|part| matches!(part,Component::Normal(name) if name.to_string_lossy().eq_ignore_ascii_case(".memnova") || name.to_string_lossy().eq_ignore_ascii_case(".git")))
    {
        return Err("Page path must stay inside the library".into());
    }
    if !path
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("markdown"))
    {
        return Err("A learning page must be a Markdown file".into());
    }
    let mut candidate = root.to_path_buf();
    for component in path.components() {
        candidate.push(component.as_os_str());
        reject_symlink(&candidate)?;
    }
    let absolute = root.join(path).canonicalize().map_err(|e| e.to_string())?;
    if !absolute.starts_with(root) {
        return Err("Page path must stay inside the library".into());
    }
    Ok(absolute)
}

pub(super) fn register_page_in(
    transaction: &rusqlite::Transaction<'_>,
    root: &Path,
    id: &str,
    path: &str,
    title: &str,
) -> Result<(), String> {
    let previous: Option<String> = transaction
        .query_row("SELECT path FROM pages WHERE id=?1", [id], |row| row.get(0))
        .optional()
        .map_err(|e| e.to_string())?;
    if let Some(old) = previous
        .as_deref()
        .filter(|old| *old != path && root.join(old).exists())
    {
        let previous_file = root
            .join(old)
            .canonicalize()
            .map_err(|error| error.to_string())?;
        let current_file = root
            .join(path)
            .canonicalize()
            .map_err(|error| error.to_string())?;
        if previous_file != current_file {
            return Err("Duplicate page identity: the original page still exists".into());
        }
    }
    transaction.execute("INSERT INTO pages(id,path,title) VALUES(?1,?2,?3) ON CONFLICT(id) DO UPDATE SET path=excluded.path,title=excluded.title,deleted_at=NULL", (id,path,title)).map_err(|e| e.to_string())?;
    Ok(())
}

fn open_owned_database(
    root: &Path,
    library_id: &str,
    existing_identity: bool,
) -> Result<Connection, String> {
    let mut conn =
        Connection::open(root.join(".memnova/learning.sqlite3")).map_err(|e| e.to_string())?;
    conn.busy_timeout(Duration::from_secs(5))
        .map_err(|e| e.to_string())?;
    let version: u32 = conn
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if version == 0 && existing_identity {
        return Err(
            "Existing Library database is empty; restore a verified backup before continuing"
                .into(),
        );
    }
    if version > super::SCHEMA_VERSION {
        return Err("Learning database was created by a newer Memnova version".into());
    }
    if version == super::SCHEMA_VERSION {
        super::storage_metadata::validate_owner(&conn, library_id)?;
    }
    conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;")
        .map_err(|e| e.to_string())?;
    if version > 0 && version < super::SCHEMA_VERSION {
        let previous = Store {
            conn,
            library_id: library_id.to_string(),
            root: root.to_path_buf(),
        };
        previous.create_backup()?;
        conn = previous.conn;
    }
    if version < super::SCHEMA_VERSION {
        super::storage_metadata::initialize_schema(&mut conn, library_id)?;
    }
    Ok(conn)
}
