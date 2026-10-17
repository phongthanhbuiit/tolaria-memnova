use super::{Store, SCHEMA_VERSION};
use rusqlite::{Connection, OptionalExtension, Transaction, TransactionBehavior};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::json;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MigrationState {
    Legacy,
    Migrating,
    Ready,
}

pub(super) fn read_metadata<T: DeserializeOwned>(
    connection: &Connection,
    key: &str,
) -> Result<Option<T>, String> {
    let text: Option<String> = connection
        .query_row(
            "SELECT value_json FROM library_metadata WHERE key=?1",
            [key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    text.map(|text| {
        serde_json::from_str(&text)
            .map_err(|error| format!("Invalid learning metadata {key}: {error}"))
    })
    .transpose()
}

pub(super) fn write_metadata<T: Serialize>(
    transaction: &Transaction<'_>,
    key: &str,
    value: &T,
) -> Result<(), String> {
    let text = serde_json::to_string(value).map_err(|error| error.to_string())?;
    transaction.execute("INSERT INTO library_metadata(key,value_json) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json", (key,text)).map_err(|error| error.to_string())?;
    Ok(())
}

pub(super) fn validate_owner(connection: &Connection, library_id: &str) -> Result<(), String> {
    let owner: Option<String> = read_metadata(connection, "libraryId")?;
    if owner.as_deref() != Some(library_id) {
        return Err("Learning database identity does not match this Library".into());
    }
    Ok(())
}

pub(super) fn initialize_schema(
    connection: &mut Connection,
    library_id: &str,
) -> Result<(), String> {
    let transaction = connection
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|error| error.to_string())?;
    let version: u32 = transaction
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(|error| error.to_string())?;
    if version > SCHEMA_VERSION {
        return Err("Learning database was created by a newer Memnova version".into());
    }
    if version == 0 {
        transaction
            .execute_batch(include_str!("schema.sql"))
            .map_err(|error| error.to_string())?;
    }
    if version < 2 {
        transaction.execute_batch("CREATE TABLE library_metadata(key TEXT PRIMARY KEY NOT NULL,value_json TEXT NOT NULL); PRAGMA user_version=2;").map_err(|error| error.to_string())?;
        write_metadata(&transaction, "libraryId", &library_id)?;
        write_metadata(&transaction, "migrationState", &MigrationState::Legacy)?;
        write_metadata(&transaction, "dailyGoal", &json!(20))?;
    }
    validate_owner(&transaction, library_id)?;
    transaction.commit().map_err(|error| error.to_string())
}

impl Store {
    pub fn migration_state(&self) -> Result<MigrationState, String> {
        read_metadata(&self.conn, "migrationState")?
            .ok_or_else(|| "Learning migration state is missing".into())
    }

    pub(super) fn ensure_card_writes_allowed(&self) -> Result<(), String> {
        if self.migration_state()? == MigrationState::Migrating {
            return Err("Finish the Library migration before editing cards".into());
        }
        Ok(())
    }
}
