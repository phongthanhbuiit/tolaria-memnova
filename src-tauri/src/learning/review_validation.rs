use super::{
    cards::read_card, session_models::SessionRow, study_source::study_page, Card, RateRequest,
};
use rusqlite::Connection;
use std::path::Path;

pub(super) fn validate_review(
    connection: &Connection,
    root: &Path,
    session: &SessionRow,
    request: &RateRequest,
) -> Result<Card, String> {
    for id in [&request.review_id, &request.session_id, &request.card_id] {
        uuid::Uuid::parse_str(id).map_err(|_| "Invalid review identity")?;
    }
    if session.revision != request.session_revision
        || session.status != "active"
        || session.queue.ids.get(session.current_index) != Some(&request.card_id)
    {
        return Err("Study session changed; reload before rating".into());
    }
    let card = read_card(connection, &request.card_id)?;
    if card.revision != request.card_revision
        || card.status != "active"
        || card.schedule.revision.checked_add(1) != Some(request.schedule.revision)
        || card.schedule.due_ms()? > chrono::Utc::now().timestamp_millis()
    {
        return Err("Study card changed or is not due; reload before rating".into());
    }
    if study_page(connection, root, &card)?.fingerprint != request.source_fingerprint {
        return Err("Lesson content changed; reload the answer before rating".into());
    }
    validate_outcome(&card, request)?;
    Ok(card)
}

fn validate_outcome(card: &Card, request: &RateRequest) -> Result<(), String> {
    let next = &request.schedule;
    next.validate()?;
    let review = next
        .last_review
        .as_deref()
        .and_then(|date| chrono::DateTime::parse_from_rfc3339(date).ok())
        .map(|date| date.timestamp_millis());
    if !(1..=4).contains(&request.rating)
        || request.duration_ms > 86_400_000
        || chrono::DateTime::from_timestamp_millis(request.reviewed_at).is_none()
        || request.reviewed_at > chrono::Utc::now().timestamp_millis() + 300_000
        || review != Some(request.reviewed_at)
        || next.due_ms()? < request.reviewed_at
        || next.engine != "ts-fsrs@5.4.2"
        || next.stability <= 0.0
        || next.difficulty < 1.0
        || card.schedule.reps.checked_add(1) != Some(next.reps)
    {
        return Err("Invalid versioned review outcome".into());
    }
    if let Some(last) = &card.schedule.last_review {
        if chrono::DateTime::parse_from_rfc3339(last)
            .map_err(|error| error.to_string())?
            .timestamp_millis()
            > request.reviewed_at
        {
            return Err("Review clock predates the previous review".into());
        }
    }
    let failed_review = card.schedule.state == "review" && request.rating == 1;
    if card.schedule.lapses.checked_add(u32::from(failed_review)) != Some(next.lapses)
        || (request.rating == 1 && !["learning", "relearning"].contains(&next.state.as_str()))
        || (request.rating == 4 && next.state != "review")
    {
        return Err("Inconsistent review transition".into());
    }
    Ok(())
}
