use super::Store;
use rusqlite::{params, Connection, Transaction};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PropertyDefinition {
    pub value_kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub item_kind: Option<String>,
}
pub type PropertyDefinitions = BTreeMap<String, PropertyDefinition>;
#[derive(Clone, Copy)]
pub(super) enum Owner {
    Page,
    Card,
}

pub(super) fn validate_definitions(definitions: &PropertyDefinitions) -> Result<(), String> {
    if definitions.len() > 256 {
        return Err("Too many property definitions".into());
    }
    for (key, definition) in definitions {
        let reserved = [
            "id",
            "revision",
            "schedule",
            "pageid",
            "answerpageid",
            "createdat",
            "updatedat",
        ];
        if key.is_empty()
            || key.len() > 256
            || key.trim() != key
            || key.starts_with('_')
            || reserved.contains(&key.to_lowercase().as_str())
        {
            return Err("Invalid or reserved property key".into());
        }
        if !["text", "number", "boolean", "date", "list", "page"]
            .contains(&definition.value_kind.as_str())
        {
            return Err("Unknown property kind".into());
        }
        if definition.value_kind == "list" {
            if !matches!(definition.item_kind.as_deref(), Some("text" | "page")) {
                return Err("Invalid list item kind".into());
            }
        } else if definition.item_kind.is_some() {
            return Err("Only lists have an item kind".into());
        }
    }
    Ok(())
}
fn page_reference(value: &Value) -> bool {
    let Some(value) = value.as_object() else {
        return false;
    };
    value
        .get("pageId")
        .and_then(Value::as_str)
        .is_some_and(|id| uuid::Uuid::parse_str(id).is_ok())
        && value.get("label").map_or(true, Value::is_string)
        && value.keys().all(|key| key == "pageId" || key == "label")
}
fn matches_value(value: &Value, definition: &PropertyDefinition) -> bool {
    match definition.value_kind.as_str() {
        "text" => value.is_string(),
        "number" => value.as_f64().is_some_and(|number| {
            number.is_finite() && (number.fract() != 0.0 || number.abs() <= 9_007_199_254_740_991.0)
        }),
        "boolean" => value.is_boolean(),
        "date" => value.as_str().is_some_and(|text| {
            text.len() == 10
                && chrono::NaiveDate::parse_from_str(text, "%Y-%m-%d")
                    .is_ok_and(|date| date.format("%Y-%m-%d").to_string() == text)
        }),
        "page" => page_reference(value),
        "list" => value.as_array().is_some_and(|items| {
            items.iter().all(|item| {
                if definition.item_kind.as_deref() == Some("page") {
                    page_reference(item)
                } else {
                    item.is_string()
                }
            })
        }),
        _ => false,
    }
}
pub(super) fn validate_values(
    values: &Value,
    definitions: &PropertyDefinitions,
) -> Result<(), String> {
    validate_definitions(definitions)?;
    for (key, definition) in definitions {
        if !values
            .get(key)
            .is_some_and(|value| matches_value(value, definition))
        {
            return Err(format!(
                "Property value does not match its declared type: {key}"
            ));
        }
    }
    Ok(())
}
fn select_sql(owner: Owner) -> &'static str {
    match owner {
        Owner::Page => "SELECT key,value_kind,item_kind FROM page_property_definitions WHERE page_id=?1 ORDER BY key",
        Owner::Card => "SELECT key,value_kind,item_kind FROM card_property_definitions WHERE card_id=?1 ORDER BY key",
    }
}
pub(super) fn read_definitions(
    connection: &Connection,
    owner: Owner,
    id: &str,
) -> Result<PropertyDefinitions, String> {
    let mut statement = connection
        .prepare(select_sql(owner))
        .map_err(|error| error.to_string())?;
    let result = statement
        .query_map([id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                PropertyDefinition {
                    value_kind: row.get(1)?,
                    item_kind: row.get(2)?,
                },
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|error| error.to_string());
    result
}
pub(super) fn write_definitions(
    transaction: &Transaction<'_>,
    owner: Owner,
    id: &str,
    definitions: &PropertyDefinitions,
) -> Result<(), String> {
    validate_definitions(definitions)?;
    let (delete,insert) = match owner {
        Owner::Page => ("DELETE FROM page_property_definitions WHERE page_id=?1","INSERT INTO page_property_definitions(page_id,key,value_kind,item_kind) VALUES(?1,?2,?3,?4)"),
        Owner::Card => ("DELETE FROM card_property_definitions WHERE card_id=?1","INSERT INTO card_property_definitions(card_id,key,value_kind,item_kind) VALUES(?1,?2,?3,?4)"),
    };
    transaction
        .execute(delete, [id])
        .map_err(|error| error.to_string())?;
    let mut statement = transaction
        .prepare(insert)
        .map_err(|error| error.to_string())?;
    for (key, definition) in definitions {
        statement
            .execute(params![
                id,
                key,
                definition.value_kind,
                definition.item_kind
            ])
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}
fn require_page(connection: &Connection, id: &str) -> Result<(), String> {
    uuid::Uuid::parse_str(id).map_err(|_| "Invalid property owner")?;
    let exists: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM pages WHERE id=?1)",
            [id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if exists {
        Ok(())
    } else {
        Err("Unknown property owner in this Library".into())
    }
}
impl Store {
    pub fn page_property_definitions(&self, page_id: &str) -> Result<PropertyDefinitions, String> {
        require_page(&self.conn, page_id)?;
        read_definitions(&self.conn, Owner::Page, page_id)
    }
    pub fn set_page_property_definitions(
        &mut self,
        page_id: &str,
        expected: &PropertyDefinitions,
        definitions: &PropertyDefinitions,
    ) -> Result<PropertyDefinitions, String> {
        self.require_learning_ready()?;
        validate_definitions(definitions)?;
        let transaction = self
            .conn
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        require_page(&transaction, page_id)?;
        let current = read_definitions(&transaction, Owner::Page, page_id)?;
        if current != *expected && current != *definitions {
            return Err("Property types changed; reload before saving".into());
        }
        write_definitions(&transaction, Owner::Page, page_id, definitions)?;
        transaction.commit().map_err(|error| error.to_string())?;
        Ok(definitions.clone())
    }
}

pub(super) fn validate_reference_owners(
    connection: &Connection,
    values: &Value,
    definitions: &PropertyDefinitions,
) -> Result<(), String> {
    for (key, definition) in definitions {
        let Some(value) = values.get(key) else {
            continue;
        };
        if definition.value_kind == "page" {
            if let Some(id) = value.get("pageId").and_then(Value::as_str) {
                require_page(connection, id)?;
            }
        } else if definition.value_kind == "list" && definition.item_kind.as_deref() == Some("page")
        {
            if let Some(items) = value.as_array() {
                for item in items {
                    if let Some(id) = item.get("pageId").and_then(Value::as_str) {
                        require_page(connection, id)?;
                    }
                }
            }
        }
    }
    Ok(())
}
