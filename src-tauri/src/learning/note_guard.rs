use rusqlite::Connection;

pub(super) fn require_note_page_writable(
    connection: &Connection,
    page_id: &str,
) -> Result<(), String> {
    let pending: bool = connection.query_row("SELECT EXISTS(SELECT 1 FROM note_learning_operations WHERE page_id=?1 AND phase!='applied')", [page_id], |row| row.get(0)).map_err(|error|error.to_string())?;
    if pending {
        return Err("pending-note-operation: recover the note operation before writing".into());
    }
    Ok(())
}
