pub use super::session_models::SessionScope;
use super::{
    cards::read_card,
    session_models::{SessionRow, StoredQueue},
    study_source::{answer_page as study_answer_page, study_page},
    MigrationState, Store, StudyItem, StudySession,
};
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};

type Candidate = (usize, String, i64);

pub(super) fn load_session(connection: &Connection, id: &str) -> Result<SessionRow, String> {
    let (scope, queue, current_index, status, revision, updated_at): (String,String,usize,String,u32,i64) = connection.query_row(
        "SELECT scope_json,queue_json,current_index,status,revision,updated_at FROM sessions WHERE id=?1",[id],
        |row| Ok((row.get(0)?,row.get(1)?,row.get::<_,u32>(2)? as usize,row.get(3)?,row.get(4)?,row.get(5)?)),
    ).map_err(|error|error.to_string())?;
    let queue: StoredQueue = serde_json::from_str(&queue).map_err(|error| error.to_string())?;
    if current_index > queue.ids.len() {
        return Err("Invalid saved session cursor".into());
    }
    Ok(SessionRow {
        id: id.into(),
        scope: serde_json::from_str(&scope).map_err(|error| error.to_string())?,
        queue,
        current_index,
        status,
        revision,
        updated_at,
    })
}

pub(super) fn save_session(connection: &Connection, row: &mut SessionRow) -> Result<(), String> {
    let previous = row.revision;
    row.revision = previous.checked_add(1).ok_or("Session revision overflow")?;
    row.updated_at = chrono::Utc::now().timestamp_millis();
    let changed = connection.execute("UPDATE sessions SET queue_json=?1,current_index=?2,status=?3,revision=?4,updated_at=?5 WHERE id=?6 AND revision=?7",params![serde_json::to_string(&row.queue).map_err(|error|error.to_string())?,u32::try_from(row.current_index).map_err(|error|error.to_string())?,row.status,row.revision,row.updated_at,row.id,previous]).map_err(|error|error.to_string())?;
    if changed != 1 {
        return Err("Study session changed; reload before continuing".into());
    }
    Ok(())
}

fn candidates(
    connection: &Connection,
    row: &SessionRow,
    now: i64,
) -> Result<Vec<Candidate>, String> {
    let ids = serde_json::to_string(&row.queue.ids).map_err(|error| error.to_string())?;
    let mut query = connection.prepare("SELECT CAST(q.key AS INTEGER),c.id,s.due_ms FROM json_each(?1) q JOIN cards c ON c.id=q.value JOIN schedules s ON s.card_id=c.id JOIN pages p ON p.id=c.page_id WHERE CAST(q.key AS INTEGER)>=?2 AND c.status='active' AND p.deleted_at IS NULL AND (s.due_ms<=?3 OR s.state IN ('learning','relearning')) ORDER BY CAST(q.key AS INTEGER)").map_err(|error|error.to_string())?;
    let result = query
        .query_map(
            params![
                ids,
                u32::try_from(row.current_index).map_err(|error| error.to_string())?,
                now
            ],
            |row| Ok((row.get::<_, u32>(0)? as usize, row.get(1)?, row.get(2)?)),
        )
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string());
    result
}

fn select_ready(
    connection: &Connection,
    row: &mut SessionRow,
    pending: &[Candidate],
    now: i64,
) -> Result<Option<String>, String> {
    let old_index = row.current_index;
    let old_status = row.status.clone();
    let ready = pending.iter().find(|candidate| candidate.2 <= now);
    if let Some(first) = pending.first() {
        row.current_index = first.0;
    } else {
        row.current_index = row.queue.ids.len();
        row.status = "completed".into();
    }
    let reordered = ready.is_some_and(|candidate| candidate.0 != row.current_index);
    if let Some(candidate) = ready {
        row.queue.ids.swap(row.current_index, candidate.0);
    }
    if old_index != row.current_index || old_status != row.status || reordered {
        save_session(connection, row)?;
    }
    Ok(ready.map(|candidate| candidate.1.clone()))
}

fn review_summary(connection: &Connection, id: &str) -> Result<(usize, usize), String> {
    connection.query_row("SELECT count(*),coalesce(sum(rating>=3),0) FROM reviews WHERE session_id=?1 AND undone_at IS NULL",[id],|row|Ok((row.get::<_,u32>(0)? as usize,row.get::<_,u32>(1)? as usize))).map_err(|error|error.to_string())
}

fn last_review(connection: &Connection, row: &SessionRow) -> Result<Option<String>, String> {
    let latest: Option<(String,String,String)> = connection.query_row(
        "SELECT id,session_id,after_json FROM reviews WHERE session_id IS NOT NULL AND undone_at IS NULL ORDER BY rowid DESC LIMIT 1",[],
        |row|Ok((row.get(0)?,row.get(1)?,row.get(2)?)),
    ).optional().map_err(|error|error.to_string())?;
    let Some((id, session, after)) = latest else {
        return Ok(None);
    };
    if session != row.id {
        return Ok(None);
    }
    let after: super::session_models::ReviewAfter =
        serde_json::from_str(&after).map_err(|error| error.to_string())?;
    let current = read_card(connection, &after.request.card_id)?;
    Ok((current.schedule == after.schedule).then_some(id))
}

impl Store {
    pub(super) fn require_learning_ready(&self) -> Result<(), String> {
        if self.migration_state()? != MigrationState::Ready {
            return Err("Finish Library migration before studying".into());
        }
        Ok(())
    }

    pub fn start_session(&mut self, mut scope: SessionScope) -> Result<StudySession, String> {
        self.require_learning_ready()?;
        scope.normalize()?;
        let scope_json = serde_json::to_string(&scope).map_err(|error| error.to_string())?;
        let transaction = self
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        let existing: Option<String> = transaction.query_row("SELECT id FROM sessions WHERE scope_json=?1 AND status!='completed' ORDER BY updated_at DESC LIMIT 1",[&scope_json],|row|row.get(0)).optional().map_err(|error|error.to_string())?;
        if let Some(id) = existing {
            drop(transaction);
            return self.resume_session(&id);
        }
        let now = chrono::Utc::now().timestamp_millis();
        let mut query=transaction.prepare("SELECT c.id,c.page_id FROM cards c JOIN schedules s ON s.card_id=c.id JOIN pages p ON p.id=c.page_id WHERE c.status='active' AND p.deleted_at IS NULL AND s.due_ms<=?1 ORDER BY s.due_ms,c.created_at,c.id").map_err(|error|error.to_string())?;
        let rows = query
            .query_map([now], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|error| error.to_string())?;
        let mut ids = Vec::new();
        for entry in rows {
            let (id, page) = entry.map_err(|error| error.to_string())?;
            if scope
                .page_ids
                .as_ref()
                .map_or(true, |pages| pages.contains(&page))
            {
                ids.push(id);
            }
        }
        drop(query);
        let queue = StoredQueue {
            initial_count: ids.len(),
            ids,
        };
        let id = uuid::Uuid::new_v4().to_string();
        transaction.execute("INSERT INTO sessions(id,scope_json,queue_json,current_index,status,updated_at) VALUES(?1,?2,?3,0,?4,?5)",params![id,scope_json,serde_json::to_string(&queue).map_err(|error|error.to_string())?,if queue.ids.is_empty(){"completed"}else{"active"},now]).map_err(|error|error.to_string())?;
        transaction.commit().map_err(|error| error.to_string())?;
        self.get_session(&id)
    }

    pub fn get_session(&mut self, id: &str) -> Result<StudySession, String> {
        self.session_at(id, chrono::Utc::now().timestamp_millis())
    }

    pub(super) fn session_at(&mut self, id: &str, now: i64) -> Result<StudySession, String> {
        self.require_learning_ready()?;
        let transaction = self
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        let mut row = load_session(&transaction, id)?;
        let pending = candidates(&transaction, &row, now)?;
        let current_id = select_ready(&transaction, &mut row, &pending, now)?;
        let current = current_id
            .map(|id| {
                let card = read_card(&transaction, &id)?;
                let (page, mut source_error) = match study_page(&transaction, &self.root, &card) {
                    Ok(page) => (Some(page), None),
                    Err(error) => (None, Some(error)),
                };
                let answer_page = if page.is_some() {
                    match study_answer_page(&transaction, &self.root, &card) {
                        Ok(answer) => answer,
                        Err(error) => {
                            source_error = Some(error);
                            None
                        }
                    }
                } else {
                    None
                };
                Ok::<_, String>(StudyItem {
                    card,
                    page,
                    answer_page,
                    source_error,
                })
            })
            .transpose()?;
        let (review_count, correct_count) = review_summary(&transaction, id)?;
        let last_review_id = last_review(&transaction, &row)?;
        let result = StudySession {
            id: row.id,
            scope: row.scope,
            initial_count: row.queue.initial_count,
            current_index: row.current_index,
            status: row.status,
            revision: row.revision,
            updated_at: row.updated_at,
            waiting_until: if current.is_none() {
                pending.iter().map(|candidate| candidate.2).min()
            } else {
                None
            },
            current,
            completed_count: row.queue.initial_count.saturating_sub(pending.len()),
            review_count,
            correct_count,
            can_undo: last_review_id.is_some(),
            last_review_id,
        };
        transaction.commit().map_err(|error| error.to_string())?;
        Ok(result)
    }

    pub fn resume_session(&mut self, id: &str) -> Result<StudySession, String> {
        self.require_learning_ready()?;
        let mut row = load_session(&self.conn, id)?;
        if row.status == "paused" {
            row.status = "active".into();
            save_session(&self.conn, &mut row)?;
        }
        self.get_session(id)
    }

    pub fn pause_session(&mut self, id: &str, revision: u32) -> Result<StudySession, String> {
        self.require_learning_ready()?;
        let mut row = load_session(&self.conn, id)?;
        if row.revision != revision {
            return Err("Study session changed; reload before pausing".into());
        }
        if row.status == "active" {
            row.status = "paused".into();
            save_session(&self.conn, &mut row)?;
        }
        self.get_session(id)
    }

    pub fn skip_session_card(&mut self, id: &str, revision: u32) -> Result<StudySession, String> {
        self.require_learning_ready()?;
        let mut row = load_session(&self.conn, id)?;
        if row.revision != revision || row.current_index >= row.queue.ids.len() {
            return Err("Study card changed; reload before skipping".into());
        }
        row.current_index += 1;
        save_session(&self.conn, &mut row)?;
        self.get_session(id)
    }
}
