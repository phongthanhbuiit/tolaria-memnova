use super::Store;
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteBinding {
    pub page_id: String,
    pub card_id: String,
    pub source_hash: String,
    pub revision: u32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NoteOperationKind {
    Configure,
    Save,
    Reconcile,
    Convert,
}

impl NoteOperationKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Configure => "configure",
            Self::Save => "save",
            Self::Reconcile => "reconcile",
            Self::Convert => "convert",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NoteOperationPhase {
    Prepared,
    FileWritten,
    Applied,
    Conflict,
}

impl NoteOperationPhase {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Prepared => "prepared",
            Self::FileWritten => "file_written",
            Self::Applied => "applied",
            Self::Conflict => "conflict",
        }
    }
}

fn valid_source_hash(hash: &str) -> bool {
    hash.len() == 64
        && hash
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
}

impl Store {
    pub fn note_binding(&self, page_id: &str) -> Result<Option<NoteBinding>, String> {
        read_note_binding(&self.conn, page_id)
    }
}

pub(super) fn read_note_binding(
    connection: &rusqlite::Connection,
    page_id: &str,
) -> Result<Option<NoteBinding>, String> {
    uuid::Uuid::parse_str(page_id).map_err(|_| "Invalid note identity")?;
    let binding: Option<NoteBinding> = connection
        .query_row(
            "SELECT page_id,card_id,source_hash,revision FROM note_card_bindings WHERE page_id=?1",
            [page_id],
            |row| {
                Ok(NoteBinding {
                    page_id: row.get(0)?,
                    card_id: row.get(1)?,
                    source_hash: row.get(2)?,
                    revision: row.get(3)?,
                })
            },
        )
        .optional()
        .map_err(|error| error.to_string())?;
    if let Some(binding) = &binding {
        uuid::Uuid::parse_str(&binding.card_id).map_err(|_| "Invalid bound card identity")?;
        let owner: String = connection
            .query_row(
                "SELECT page_id FROM cards WHERE id=?1",
                [&binding.card_id],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if owner != binding.page_id || !valid_source_hash(&binding.source_hash) {
            return Err("Invalid note learning binding; existing data was preserved".into());
        }
    }
    Ok(binding)
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteOperationSummary {
    pub operation_id: String,
    pub kind: NoteOperationKind,
    pub phase: NoteOperationPhase,
    pub created_at: i64,
}

pub(super) fn pending_operations(
    connection: &rusqlite::Connection,
    page_id: &str,
    ignore: Option<&str>,
) -> Result<Vec<NoteOperationSummary>, String> {
    let mut query = connection.prepare("SELECT id,kind,phase,created_at FROM note_learning_operations WHERE page_id=?1 AND phase!='applied' AND (?2 IS NULL OR id!=?2) ORDER BY created_at,id").map_err(|error| error.to_string())?;
    let rows = query
        .query_map(rusqlite::params![page_id, ignore], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
            ))
        })
        .map_err(|error| error.to_string())?;
    rows.map(|row| {
        let (operation_id, kind, phase, created_at) = row.map_err(|error| error.to_string())?;
        uuid::Uuid::parse_str(&operation_id).map_err(|_| "Invalid pending operation identity")?;
        Ok(NoteOperationSummary {
            operation_id,
            kind: serde_json::from_value(serde_json::Value::String(kind))
                .map_err(|error| error.to_string())?,
            phase: serde_json::from_value(serde_json::Value::String(phase))
                .map_err(|error| error.to_string())?,
            created_at,
        })
    })
    .collect()
}
