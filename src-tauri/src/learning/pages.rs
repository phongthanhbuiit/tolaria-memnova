use super::{
    legacy_markdown,
    migration_import::persist_identity,
    migration_plan::content_hash,
    page_identity::with_page_id,
    storage_metadata::{read_metadata, write_metadata},
    store::register_page_in,
    Store,
};
use rusqlite::OptionalExtension;
use serde::Serialize;
use std::{collections::HashMap, fs, path::Path};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LearningPage {
    pub id: String,
    pub path: String,
    pub title: String,
    pub available: bool,
    pub created_at: Option<u64>,
    pub modified_at: Option<u64>,
}

fn seconds(time: std::io::Result<std::time::SystemTime>) -> Option<u64> {
    time.ok()?
        .duration_since(std::time::UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_secs())
}

pub(super) fn source_ids(root: &Path) -> Result<HashMap<String, (String, String)>, String> {
    let mut result = HashMap::new();
    let walker = walkdir::WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| {
            entry.depth() == 0 || !entry.file_name().to_string_lossy().starts_with('.')
        });
    for entry in walker {
        let entry = entry.map_err(|error| error.to_string())?;
        if !entry.file_type().is_file()
            || !entry
                .path()
                .extension()
                .and_then(|ext| ext.to_str())
                .is_some_and(|ext| {
                    ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("markdown")
                })
        {
            continue;
        }
        let source = fs::read_to_string(entry.path()).map_err(|error| error.to_string())?;
        let Ok((metadata, _)) = legacy_markdown::frontmatter(&source) else {
            continue;
        };
        let Some(id) = legacy_markdown::page_id(&metadata)? else {
            continue;
        };
        let relative = entry
            .path()
            .strip_prefix(root)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .replace(std::path::MAIN_SEPARATOR, "/");
        let title = legacy_markdown::title(&metadata, &source, &relative);
        if result.insert(id, (relative, title)).is_some() {
            return Err(
                "Duplicate lesson identities; resolve the copied page before continuing".into(),
            );
        }
    }
    Ok(result)
}

pub(super) fn page_identity_at(
    connection: &rusqlite::Connection,
    path: &str,
) -> Result<Option<String>, String> {
    connection
        .query_row(
            "SELECT id FROM pages WHERE path=?1 AND deleted_at IS NULL",
            [path],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())
}

impl Store {
    pub fn list_pages(&self) -> Result<Vec<LearningPage>, String> {
        let mut query = self
            .conn
            .prepare("SELECT id,path,title,deleted_at FROM pages ORDER BY title,id")
            .map_err(|error| error.to_string())?;
        let rows = query
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<i64>>(3)?,
                ))
            })
            .map_err(|error| error.to_string())?;
        let mut pages = Vec::new();
        for row in rows {
            let (id, path, title, deleted) = row.map_err(|error| error.to_string())?;
            let file = self.page_path(&path).ok();
            let metadata = file.as_ref().and_then(|path| fs::metadata(path).ok());
            let available = deleted.is_none()
                && file
                    .as_ref()
                    .and_then(|path| fs::read_to_string(path).ok())
                    .and_then(|source| {
                        legacy_markdown::frontmatter(&source)
                            .ok()
                            .and_then(|(metadata, _)| {
                                legacy_markdown::page_id(&metadata).ok().flatten()
                            })
                    })
                    .as_deref()
                    == Some(id.as_str());
            let original: Option<serde_json::Value> =
                read_metadata(&self.conn, &format!("sourceTimes:{id}"))?;
            let created_at = original
                .as_ref()
                .and_then(|value| value.get("createdAt"))
                .and_then(serde_json::Value::as_u64)
                .or_else(|| {
                    metadata
                        .as_ref()
                        .and_then(|metadata| seconds(metadata.created()))
                });
            let modified_at = metadata
                .as_ref()
                .and_then(|metadata| seconds(metadata.modified()));
            pages.push(LearningPage {
                id,
                path,
                title,
                available,
                created_at,
                modified_at,
            });
        }
        Ok(pages)
    }

    pub fn sync_pages(&mut self) -> Result<Vec<LearningPage>, String> {
        self.require_learning_ready()?;
        let sources = source_ids(&self.root)?;
        let by_path: HashMap<_, _> = sources
            .iter()
            .map(|(id, (path, _))| (path.as_str(), id.as_str()))
            .collect();
        let previous = self.list_pages()?;
        let transaction = self
            .conn
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        for page in previous {
            if sources.contains_key(&page.id) || page.path.starts_with(".memnova/retired/") {
                continue;
            }
            let replaced = by_path
                .get(page.path.as_str())
                .is_some_and(|id| *id != page.id);
            if !self.root.join(&page.path).exists() || replaced {
                write_metadata(
                    &transaction,
                    &format!("retiredPath:{}", page.id),
                    &page.path,
                )?;
                transaction
                    .execute(
                        "UPDATE pages SET deleted_at=coalesce(deleted_at,?1),path=?2 WHERE id=?3",
                        (
                            chrono::Utc::now().timestamp_millis(),
                            format!(".memnova/retired/{}.md", page.id),
                            page.id,
                        ),
                    )
                    .map_err(|error| error.to_string())?;
            }
        }
        for (id, (path, title)) in sources {
            register_page_in(&transaction, &self.root, &id, &path, &title)?;
        }
        transaction.commit().map_err(|error| error.to_string())?;
        self.list_pages()
    }

    pub fn ensure_page(&mut self, relative: &str) -> Result<LearningPage, String> {
        self.ensure_page_with_hash(relative, None)
    }

    pub fn ensure_page_with_hash(
        &mut self,
        relative: &str,
        expected_hash: Option<&str>,
    ) -> Result<LearningPage, String> {
        self.require_learning_ready()?;
        let path = self.page_path(relative)?;
        let source = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        if expected_hash.is_some_and(|expected| expected != content_hash(&source)) {
            return Err("Changed source before identity assignment; refresh the preview".into());
        }
        let (metadata, _) = legacy_markdown::frontmatter(&source)?;
        let owned = legacy_markdown::page_id(&metadata)?;
        if owned.is_some() {
            self.sync_pages()?;
        }
        let title = legacy_markdown::title(&metadata, &source, relative);
        let id = owned
            .clone()
            .or(page_identity_at(&self.conn, relative)?)
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        if owned.is_none() {
            self.create_backup()?;
        }
        let file = fs::metadata(&path).map_err(|error| error.to_string())?;
        let transaction = self
            .conn
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        register_page_in(&transaction, &self.root, &id, relative, &title)?;
        let key = format!("sourceTimes:{id}");
        if read_metadata::<serde_json::Value>(&transaction, &key)?.is_none() {
            write_metadata(
                &transaction,
                &key,
                &serde_json::json!({"createdAt":seconds(file.created()),"modifiedAt":seconds(file.modified())}),
            )?;
        }
        transaction.commit().map_err(|error| error.to_string())?;
        if owned.is_none() {
            if content_hash(&fs::read_to_string(&path).map_err(|error| error.to_string())?)
                != content_hash(&source)
            {
                return Err("Lesson changed during identity assignment; retry".into());
            }
            persist_identity(
                &path,
                &with_page_id(&source, &id)?,
                seconds(file.modified()),
            )?;
        }
        self.list_pages()?
            .into_iter()
            .find(|page| page.id == id)
            .ok_or_else(|| "Learning page was not registered".into())
    }
}
