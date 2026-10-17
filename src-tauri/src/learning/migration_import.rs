use super::{
    cards::insert_card,
    migration_plan::{content_hash, page_marker, MigrationPlan, PlannedPage},
    page_identity::with_page_id,
    storage_metadata::{read_metadata, write_metadata},
    store::register_page_in,
    MigrationProgress, MigrationState, Store,
};
use std::{fs, io::Write, path::Path, sync::Mutex};

pub(super) static MIGRATION_OPERATION: Mutex<()> = Mutex::new(());

pub(super) fn persist_identity(
    path: &Path,
    content: &str,
    modified_at: Option<u64>,
) -> Result<(), String> {
    let parent = path.parent().ok_or("Page has no parent directory")?;
    let permissions = fs::metadata(path)
        .map_err(|error| error.to_string())?
        .permissions();
    let mut staged = tempfile::NamedTempFile::new_in(parent).map_err(|error| error.to_string())?;
    staged
        .as_file()
        .set_permissions(permissions)
        .map_err(|error| error.to_string())?;
    staged
        .write_all(content.as_bytes())
        .map_err(|error| error.to_string())?;
    if let Some(seconds) = modified_at {
        staged
            .as_file()
            .set_modified(std::time::UNIX_EPOCH + std::time::Duration::from_secs(seconds))
            .map_err(|error| error.to_string())?;
    }
    staged
        .as_file()
        .sync_all()
        .map_err(|error| error.to_string())?;
    staged.persist(path).map_err(|error| error.to_string())?;
    Ok(())
}

impl Store {
    fn ensure_planned_source(&self, page: &PlannedPage) -> Result<(), String> {
        let path = self.page_path(&page.path)?;
        let source = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        let fingerprint = content_hash(&source);
        if fingerprint == page.updated_hash {
            return Ok(());
        }
        if fingerprint != page.original_hash {
            return Err(format!("Page changed during migration: {}", page.path));
        }
        let updated = with_page_id(&source, &page.id)?;
        if content_hash(&updated) != page.updated_hash {
            return Err("Migration checkpoint does not match the planned page identity".into());
        }
        persist_identity(&path, &updated, page.original_modified_at)
    }

    fn import_planned_page(
        &mut self,
        plan: &MigrationPlan,
        page: &PlannedPage,
    ) -> Result<(), String> {
        self.ensure_planned_source(page)?;
        let transaction = self.conn.transaction().map_err(|error| error.to_string())?;
        register_page_in(&transaction, &self.root, &page.id, &page.path, &page.title)?;
        if let (Some(card_id), Some(card)) = (&page.card_id, &page.card) {
            let key = format!("legacy-note:{}", page.id);
            let imported = transaction
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM imports WHERE source_key=?1)",
                    [&key],
                    |row| row.get::<_, bool>(0),
                )
                .map_err(|error| error.to_string())?;
            if !imported {
                insert_card(&transaction, card_id, &page.id, &card.draft, &card.schedule)?;
                transaction.execute("INSERT INTO imports(source_key,card_id,source_fingerprint,imported_at) VALUES(?1,?2,?3,?4)", (&key,card_id,&page.original_hash,chrono::Utc::now().timestamp_millis())).map_err(|error| error.to_string())?;
            }
        }
        write_metadata(&transaction, &page_marker(plan, page), &true)?;
        write_metadata(
            &transaction,
            &format!("sourceTimes:{}", page.id),
            &serde_json::json!({
                "createdAt":page.original_created_at,"modifiedAt":page.original_modified_at,
            }),
        )?;
        transaction.commit().map_err(|error| error.to_string())
    }

    pub fn resume_migration(&mut self, batch_size: usize) -> Result<MigrationProgress, String> {
        let _operation = MIGRATION_OPERATION
            .lock()
            .map_err(|error| error.to_string())?;
        if self.migration_state()? == MigrationState::Ready {
            return self.migration_progress();
        }
        if self.migration_state()? != MigrationState::Migrating {
            return Err("No migration is in progress".into());
        }
        if !(1..=250).contains(&batch_size) {
            return Err("Invalid migration batch size".into());
        }
        let plan = self.load_migration_plan()?;
        let mut imported = 0;
        for page in &plan.pages {
            if read_metadata::<bool>(&self.conn, &page_marker(&plan, page))? == Some(true) {
                continue;
            }
            self.import_planned_page(&plan, page)?;
            imported += 1;
            if imported == batch_size {
                break;
            }
        }
        let progress = self.migration_progress()?;
        if progress.imported_pages == progress.total_pages {
            return self.finish_migration(&plan, progress);
        }
        Ok(progress)
    }

    fn finish_migration(
        &mut self,
        plan: &MigrationPlan,
        mut progress: MigrationProgress,
    ) -> Result<MigrationProgress, String> {
        let source = super::preview_migration(&self.root, None)?;
        if source.issues.iter().any(|issue| issue.severity == "error")
            || source.pages.len() != plan.pages.len()
        {
            return Err(
                "Library changed during migration; review source conflicts before cutover".into(),
            );
        }
        let paths: std::collections::HashSet<_> =
            source.pages.iter().map(|page| page.path.as_str()).collect();
        if plan
            .pages
            .iter()
            .any(|page| !paths.contains(page.path.as_str()))
        {
            return Err("The source page set changed during migration".into());
        }
        for page in &plan.pages {
            self.ensure_planned_source(page)?;
        }
        let transaction = self.conn.transaction().map_err(|error| error.to_string())?;
        preserve_legacy_profile(&transaction, plan)?;
        progress.imported_reviews = import_legacy_reviews(&transaction, plan)?;
        progress.state = MigrationState::Ready;
        write_metadata(&transaction, "migrationReport", &progress)?;
        write_metadata(&transaction, "migrationState", &MigrationState::Ready)?;
        transaction
            .execute("DELETE FROM library_metadata WHERE key='migrationPlan'", [])
            .map_err(|error| error.to_string())?;
        transaction.commit().map_err(|error| error.to_string())?;
        Ok(progress)
    }
}

fn import_legacy_reviews(
    transaction: &rusqlite::Transaction<'_>,
    plan: &MigrationPlan,
) -> Result<usize, String> {
    let cards: std::collections::HashMap<_, _> = plan
        .pages
        .iter()
        .filter_map(|page| page.card_id.as_ref().map(|id| (page.path.as_str(), id)))
        .collect();
    let mut imported = 0;
    for review in &plan.reviews {
        let Some(card_id) = cards.get(review.note_path.as_str()) else {
            continue;
        };
        transaction.execute("INSERT OR IGNORE INTO reviews(id,card_id,rating,reviewed_at,engine) VALUES(?1,?2,?3,?4,'legacy-fsrs5')", (&review.id,*card_id,review.rating,review.reviewed_at)).map_err(|error| error.to_string())?;
        let existing: (String, u8, i64, String) = transaction
            .query_row(
                "SELECT card_id,rating,reviewed_at,engine FROM reviews WHERE id=?1",
                [&review.id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .map_err(|error| error.to_string())?;
        if existing
            != (
                (*card_id).clone(),
                review.rating,
                review.reviewed_at,
                "legacy-fsrs5".into(),
            )
        {
            return Err(
                "Conflicting legacy review identity; existing history was preserved".into(),
            );
        }
        imported += 1;
    }
    Ok(imported)
}

fn preserve_legacy_profile(
    transaction: &rusqlite::Transaction<'_>,
    plan: &MigrationPlan,
) -> Result<(), String> {
    if let Some(raw) = &plan.profile_raw {
        write_metadata(transaction, "legacyProfileRaw", raw)?;
        if let Ok(profile) = serde_json::from_str::<serde_json::Value>(raw) {
            if let Some(goal) = profile
                .get("dailyGoal")
                .and_then(serde_json::Value::as_u64)
                .filter(|goal| *goal > 0 && *goal <= u32::MAX as u64)
            {
                write_metadata(transaction, "dailyGoal", &goal)?;
            }
            write_metadata(transaction, "legacyProfile", &profile)?;
        }
    }
    if let Some(raw) = &plan.reviews_raw {
        write_metadata(transaction, "legacyReviewLogRaw", raw)?;
    }
    Ok(())
}
