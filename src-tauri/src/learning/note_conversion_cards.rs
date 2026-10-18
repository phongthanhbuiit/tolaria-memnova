use super::{
    cards::read_card, migration_plan::content_hash, note_conversion_models::NoteConversionCandidate,
};
use rusqlite::{types::ValueRef, Connection};
use serde_json::Value;

pub(super) fn rows_fingerprint(
    connection: &Connection,
    sql: &str,
    id: &str,
) -> Result<String, String> {
    let mut query = connection.prepare(sql).map_err(|error| error.to_string())?;
    let columns = query.column_count();
    let rows = query
        .query_map([id], |row| {
            (0..columns)
                .map(|index| {
                    Ok(match row.get_ref(index)? {
                        ValueRef::Null => Value::Null,
                        ValueRef::Integer(value) => serde_json::json!({"integer":value}),
                        ValueRef::Real(value) => serde_json::json!({"real":value}),
                        ValueRef::Text(value) => {
                            serde_json::json!({"text":String::from_utf8_lossy(value)})
                        }
                        ValueRef::Blob(value) => serde_json::json!({"blob":value}),
                    })
                })
                .collect::<Result<Vec<_>, _>>()
        })
        .map_err(|error| error.to_string())?;
    let rows = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    Ok(content_hash(
        &serde_json::to_string(&rows).map_err(|error| error.to_string())?,
    ))
}
fn candidate(connection: &Connection, id: &str) -> Result<NoteConversionCandidate, String> {
    let card = read_card(connection, id)?;
    let properties_raw = connection
        .query_row(
            "SELECT properties_json FROM cards WHERE id=?1",
            [id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let (review_count, undone_review_count) = connection
        .query_row(
            "SELECT count(*),coalesce(sum(undone_at IS NOT NULL),0) FROM reviews WHERE card_id=?1",
            [id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|error| error.to_string())?;
    let mut parts = Vec::new();
    for sql in [
        "SELECT * FROM cards WHERE id=?1",
        "SELECT * FROM schedules WHERE card_id=?1",
        "SELECT * FROM reviews WHERE card_id=?1 ORDER BY id",
        "SELECT * FROM card_property_definitions WHERE card_id=?1 ORDER BY key",
        "SELECT * FROM imports WHERE card_id=?1 ORDER BY source_key",
    ] {
        parts.push(rows_fingerprint(connection, sql, id)?);
    }
    Ok(NoteConversionCandidate {
        card,
        properties_raw,
        review_count,
        undone_review_count,
        storage_fingerprint: content_hash(&parts.join("\0")),
    })
}
pub(super) fn candidates(
    connection: &Connection,
    owner: &str,
) -> Result<Vec<NoteConversionCandidate>, String> {
    let mut query = connection.prepare("SELECT id FROM cards WHERE page_id=?1 AND NOT EXISTS(SELECT 1 FROM note_card_bindings b WHERE b.card_id=cards.id) ORDER BY position,id").map_err(|error| error.to_string())?;
    let ids = query
        .query_map([owner], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?;
    ids.map(|id| candidate(connection, &id.map_err(|error| error.to_string())?))
        .collect()
}
pub(super) fn sessions(connection: &Connection, owner: &str) -> Result<(String, u32), String> {
    let condition = "FROM sessions s WHERE EXISTS(SELECT 1 FROM json_each(s.queue_json,'$.ids') q JOIN cards c ON q.value=c.id WHERE c.page_id=?1)";
    let fingerprint = rows_fingerprint(
        connection,
        &format!("SELECT s.* {condition} ORDER BY s.id"),
        owner,
    )?;
    let count = connection
        .query_row(
            &format!("SELECT count(*) {condition} AND s.status='active'"),
            [owner],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    Ok((fingerprint, count))
}

pub(super) fn page_storage_fingerprint(
    connection: &Connection,
    id: &str,
) -> Result<String, String> {
    let mut parts = Vec::new();
    for sql in [
        "SELECT * FROM pages WHERE id=?1",
        "SELECT * FROM page_property_definitions WHERE page_id=?1 ORDER BY key",
        "SELECT * FROM note_card_bindings WHERE page_id=?1",
    ] {
        parts.push(rows_fingerprint(connection, sql, id)?);
    }
    Ok(content_hash(&parts.join("\0")))
}
