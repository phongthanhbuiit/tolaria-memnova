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
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

impl Store {
    pub fn note_binding(&self, page_id: &str) -> Result<Option<NoteBinding>, String> {
        uuid::Uuid::parse_str(page_id).map_err(|_| "Invalid note identity")?;
        let binding: Option<NoteBinding> = self.conn.query_row(
            "SELECT page_id,card_id,source_hash,revision FROM note_card_bindings WHERE page_id=?1",
            [page_id], |row| Ok(NoteBinding { page_id: row.get(0)?, card_id: row.get(1)?, source_hash: row.get(2)?, revision: row.get(3)? }),
        ).optional().map_err(|error| error.to_string())?;
        if let Some(binding) = &binding {
            uuid::Uuid::parse_str(&binding.card_id).map_err(|_| "Invalid bound card identity")?;
            let owner: String = self
                .conn
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
}
