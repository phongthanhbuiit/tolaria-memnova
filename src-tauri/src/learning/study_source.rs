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
    let (path, title): (String, String) = connection
        .query_row(
            "SELECT path,title FROM pages WHERE id=?1 AND deleted_at IS NULL",
            [&card.page_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|error| error.to_string())?;
    let source =
        fs::read_to_string(checked_page_path(root, &path)?).map_err(|error| error.to_string())?;
    let (metadata, body) = legacy_markdown::frontmatter(&source)?;
    if legacy_markdown::page_id(&metadata)?.as_deref() != Some(&card.page_id) {
        return Err("The lesson identity changed; reload or restore its original source".into());
    }
    Ok(StudyPage {
        id: card.page_id.clone(),
        path,
        title,
        content: body.into(),
        fingerprint: content_hash(&source),
    })
}
