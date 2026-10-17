use super::{
    cards::write_schedule,
    session_models::{ReviewAfter, ReviewBefore},
    sessions::{load_session, save_session},
    storage_metadata::read_metadata,
    RateRequest, RateResult, Store, StudySession,
};
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};

fn previous_receipt(
    connection: &Connection,
    request: &RateRequest,
) -> Result<Option<ReviewAfter>, String> {
    let row: Option<(Option<String>, Option<i64>)> = connection
        .query_row(
            "SELECT after_json,undone_at FROM reviews WHERE id=?1",
            [&request.review_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    let Some((after, undone)) = row else {
        return Ok(None);
    };
    let after: ReviewAfter = serde_json::from_str(
        after
            .as_deref()
            .ok_or("Review identity is already in use")?,
    )
    .map_err(|error| error.to_string())?;
    if after.request != *request || undone.is_some() {
        return Err("Review identity was reused or undone; reload the session".into());
    }
    Ok(Some(after))
}

fn earned_xp(
    connection: &Connection,
    rating: u8,
    duration: u32,
    reviewed_at: i64,
) -> Result<u32, String> {
    if rating == 1 {
        return Ok(0);
    }
    let base = if rating == 2 {
        3
    } else if rating == 3 {
        5
    } else {
        7
    };
    let speed = if rating >= 3 && duration < 3000 { 2 } else { 0 };
    if rating < 3 {
        return Ok(base + speed);
    }
    let mut query=connection.prepare("SELECT rating FROM reviews WHERE session_id IS NOT NULL AND undone_at IS NULL AND date(reviewed_at/1000,'unixepoch','localtime')=date(?1/1000,'unixepoch','localtime') ORDER BY rowid DESC LIMIT 10").map_err(|error|error.to_string())?;
    let ratings = query
        .query_map([reviewed_at], |row| row.get::<_, u8>(0))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    let correct = ratings.iter().take_while(|rating| **rating >= 3).count() as u32;
    let day = chrono::DateTime::from_timestamp_millis(reviewed_at)
        .ok_or("Invalid review date")?
        .with_timezone(&chrono::Local)
        .format("%Y-%m-%d")
        .to_string();
    let inherited = if ratings.len() < 10 && correct as usize == ratings.len() {
        read_metadata::<serde_json::Value>(connection, "legacyProfile")?
            .filter(|profile| {
                profile
                    .get("lastStudyDate")
                    .and_then(serde_json::Value::as_str)
                    == Some(day.as_str())
            })
            .and_then(|profile| profile.get("combo").and_then(serde_json::Value::as_u64))
            .unwrap_or(0)
            .min(10) as u32
    } else {
        0
    };
    let combo = correct + inherited + 1;
    Ok(base + speed + if combo >= 3 { combo.min(10) } else { 0 })
}

impl Store {
    pub fn rate_card(&mut self, request: RateRequest) -> Result<RateResult, String> {
        self.require_learning_ready()?;
        let transaction = self
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        if let Some(after) = previous_receipt(&transaction, &request)? {
            drop(transaction);
            return Ok(RateResult {
                session: self.get_session(&request.session_id)?,
                earned_xp: after.earned_xp,
                replayed: true,
            });
        }
        let mut session = load_session(&transaction, &request.session_id)?;
        let card = super::review_validation::validate_review(
            &transaction,
            &self.root,
            &session,
            &request,
        )?;
        let before = ReviewBefore {
            schedule: card.schedule,
            session_index: session.current_index,
        };
        let reinserted = ["learning", "relearning"].contains(&request.schedule.state.as_str());
        let earned_xp = earned_xp(
            &transaction,
            request.rating,
            request.duration_ms,
            request.reviewed_at,
        )?;
        let after = ReviewAfter {
            schedule: request.schedule.clone(),
            request: request.clone(),
            reinserted,
            earned_xp,
        };
        write_schedule(&transaction, &request.card_id, &request.schedule)?;
        transaction.execute("INSERT INTO reviews(id,card_id,session_id,rating,reviewed_at,duration_ms,before_json,after_json,engine) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",params![request.review_id,request.card_id,request.session_id,request.rating,request.reviewed_at,request.duration_ms,serde_json::to_string(&before).map_err(|error|error.to_string())?,serde_json::to_string(&after).map_err(|error|error.to_string())?,request.schedule.engine]).map_err(|error|error.to_string())?;
        session.current_index += 1;
        if reinserted {
            session.queue.ids.push(request.card_id.clone());
        }
        save_session(&transaction, &mut session)?;
        transaction.commit().map_err(|error| error.to_string())?;
        Ok(RateResult {
            session: self.get_session(&request.session_id)?,
            earned_xp,
            replayed: false,
        })
    }

    pub fn undo_review(
        &mut self,
        session_id: &str,
        review_id: &str,
        revision: u32,
    ) -> Result<StudySession, String> {
        self.require_learning_ready()?;
        let transaction = self
            .conn
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        let mut session = load_session(&transaction, session_id)?;
        let latest:Option<String>=transaction.query_row("SELECT id FROM reviews WHERE session_id IS NOT NULL AND undone_at IS NULL ORDER BY rowid DESC LIMIT 1",[],|row|row.get(0)).optional().map_err(|error|error.to_string())?;
        if latest.as_deref() != Some(review_id) || session.revision != revision {
            return Err("Only the latest unchanged review can be undone".into());
        }
        let (before, after): (String, String) = transaction
            .query_row(
                "SELECT before_json,after_json FROM reviews WHERE id=?1 AND session_id=?2",
                (review_id, session_id),
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|error| error.to_string())?;
        let before: ReviewBefore =
            serde_json::from_str(&before).map_err(|error| error.to_string())?;
        let after: ReviewAfter = serde_json::from_str(&after).map_err(|error| error.to_string())?;
        restore_review(&transaction, &mut session, before, &after)?;
        transaction
            .execute(
                "UPDATE reviews SET undone_at=?1 WHERE id=?2 AND undone_at IS NULL",
                (chrono::Utc::now().timestamp_millis(), review_id),
            )
            .map_err(|error| error.to_string())?;
        transaction.commit().map_err(|error| error.to_string())?;
        self.get_session(session_id)
    }
}

fn restore_review(
    connection: &rusqlite::Transaction<'_>,
    session: &mut super::session_models::SessionRow,
    before: ReviewBefore,
    after: &ReviewAfter,
) -> Result<(), String> {
    let current = super::cards::read_card(connection, &after.request.card_id)?;
    if current.schedule != after.schedule {
        return Err("Card schedule changed; undo would overwrite newer learning".into());
    }
    let mut restored = before.schedule;
    restored.revision = current
        .schedule
        .revision
        .checked_add(1)
        .ok_or("Schedule revision overflow")?;
    write_schedule(connection, &current.id, &restored)?;
    if after.reinserted {
        let index = session
            .queue
            .ids
            .iter()
            .enumerate()
            .skip(session.current_index)
            .rfind(|(_, id)| *id == &current.id)
            .map(|(index, _)| index)
            .ok_or("Reinserted study work changed; reload before undo")?;
        session.queue.ids.remove(index);
    }
    session.current_index = before.session_index;
    session.status = "active".into();
    save_session(connection, session)?;
    Ok(())
}
