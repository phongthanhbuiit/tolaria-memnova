use super::{
    legacy_markdown, migration_plan::content_hash, store::checked_page_path, Card, StudyPage,
};
use rusqlite::Connection;
use std::{fs, path::Path};

pub(super) fn study_page(
    connection: &Connection,
    root: &Path,
    card: &Card,
) -> Result<StudyPage, String> {
    page_by_id(connection, root, &card.page_id)
}

pub(super) fn answer_page(
    connection: &Connection,
    root: &Path,
    card: &Card,
) -> Result<Option<StudyPage>, String> {
    if card.answer_mode != "page" {
        return Ok(None);
    }
    let Some(id) = card.answer_page_id.as_deref() else {
        return Ok(None);
    };
    let mut page = page_by_id(connection, root, id)?;
    // A move can change the base for relative media even when Markdown is unchanged.
    page.fingerprint = content_hash(&format!("{}\0{}", page.path, page.fingerprint));
    Ok(Some(page))
}

pub(super) fn page_by_id(
    connection: &Connection,
    root: &Path,
    id: &str,
) -> Result<StudyPage, String> {
    let (path, title): (String, String) = connection
        .query_row(
            "SELECT path,title FROM pages WHERE id=?1 AND deleted_at IS NULL",
            [id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|error| error.to_string())?;
    let source =
        fs::read_to_string(checked_page_path(root, &path)?).map_err(|error| error.to_string())?;
    let (metadata, body) = legacy_markdown::frontmatter(&source)?;
    if legacy_markdown::page_id(&metadata)?.as_deref() != Some(id) {
        return Err("The lesson identity changed; reload or restore its original source".into());
    }
    Ok(StudyPage {
        id: id.into(),
        path,
        title,
        content: body.into(),
        fingerprint: content_hash(&source),
    })
}

impl super::Store {
    pub fn read_study_page(&self, id: &str) -> Result<StudyPage, String> {
        uuid::Uuid::parse_str(id).map_err(|_| "Invalid page identity")?;
        page_by_id(&self.conn, &self.root, id)
    }
}
