//! Validate note metadata in both the live preflight and detached backup database.
use rusqlite::Connection;

pub(super) fn verify_current(connection: &Connection) -> Result<(), String> {
    let version = connection
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(|error| error.to_string())?;
    verify(connection, version)
}

pub(super) fn verify(connection: &Connection, version: u32) -> Result<(), String> {
    if version < 5 {
        return Ok(());
    }
    let pending: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM note_learning_operations WHERE phase!='applied')",
            [],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if pending {
        return Err("Recover pending note operations before creating a healthy backup".into());
    }
    let mut bindings = connection
        .prepare("SELECT page_id FROM note_card_bindings")
        .map_err(|error| error.to_string())?;
    for owner in bindings
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?
    {
        super::note_storage::read_note_binding(
            connection,
            &owner.map_err(|error| error.to_string())?,
        )?;
    }
    verify_operations(connection)
}

fn verify_operations(connection: &Connection) -> Result<(), String> {
    let mut query = connection
        .prepare(
            "SELECT id,page_id,kind,phase,payload_json,created_at FROM note_learning_operations",
        )
        .map_err(|error| error.to_string())?;
    let rows = query
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, i64>(5)?,
            ))
        })
        .map_err(|error| error.to_string())?;
    for row in rows {
        let (id, owner, kind, phase, payload, created_at) =
            row.map_err(|error| error.to_string())?;
        uuid::Uuid::parse_str(&id).map_err(|_| "Invalid note operation identity in backup")?;
        if created_at < 0
            || chrono::DateTime::<chrono::Utc>::from_timestamp_millis(created_at).is_none()
        {
            return Err("Invalid note operation timestamp in backup".into());
        }
        match kind.as_str() {
            "save" | "configure" | "convert" => {
                super::note_write_journal::decode_note_write(
                    &id,
                    owner.as_deref(),
                    &kind,
                    &phase,
                    &payload,
                )?;
            }
            "reconcile" => {
                if phase != "applied" {
                    return Err("Incomplete reconciliation receipt".into());
                }
                let receipt: super::note_reconcile::ReconcileReceipt =
                    serde_json::from_str(&payload).map_err(|error| error.to_string())?;
                receipt.validate(owner.as_deref().ok_or("Missing reconciliation owner")?)?;
            }
            _ => return Err("Unsupported note operation payload in backup".into()),
        }
    }
    Ok(())
}
