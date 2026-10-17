use super::vault::VaultBoundary;
use crate::learning::{CardDraft, Store};
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Debug, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum LearningRequest {
    Describe,
    ListCards {
        page_id: Option<String>,
        include_trashed: bool,
    },
    CreateCard {
        page_id: String,
        draft: CardDraft,
    },
    UpdateCard {
        card_id: String,
        revision: u32,
        draft: CardDraft,
    },
    CloneCard {
        card_id: String,
    },
}

pub(super) fn execute(
    vault_path: &str,
    library_id: Option<String>,
    request: LearningRequest,
) -> Result<Value, String> {
    let boundary = VaultBoundary::from_request(Some(vault_path))?;
    boundary.child_path(".memnova")?;
    let mut store = Store::open(boundary.requested_root())?;
    if !matches!(request, LearningRequest::Describe)
        && library_id.as_deref() != Some(&store.library_id)
    {
        return Err("Library identity changed; reload before continuing".into());
    }
    let result = match request {
        LearningRequest::Describe => json!({"libraryId":store.library_id,"schemaVersion":1}),
        LearningRequest::ListCards {
            page_id,
            include_trashed,
        } => serde_json::to_value(store.list_cards(page_id.as_deref(), include_trashed)?)
            .map_err(|e| e.to_string())?,
        LearningRequest::CreateCard { page_id, draft } => {
            serde_json::to_value(store.create_card(&page_id, draft)?).map_err(|e| e.to_string())?
        }
        LearningRequest::UpdateCard {
            card_id,
            revision,
            draft,
        } => serde_json::to_value(store.update_card(&card_id, revision, draft)?)
            .map_err(|e| e.to_string())?,
        LearningRequest::CloneCard { card_id } => {
            serde_json::to_value(store.clone_card(&card_id)?).map_err(|e| e.to_string())?
        }
    };
    Ok(result)
}

#[tauri::command]
pub async fn learning_command(
    vault_path: String,
    library_id: Option<String>,
    request: LearningRequest,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || execute(&vault_path, library_id, request))
        .await
        .map_err(|e| e.to_string())?
}
