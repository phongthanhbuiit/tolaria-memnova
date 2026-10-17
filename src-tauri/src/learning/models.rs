use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardDraft {
    pub front: String,
    pub back: String,
    pub answer_mode: String,
    pub status: String,
    pub position: u32,
    pub properties: Value,
}

impl CardDraft {
    pub(super) fn validate(&self) -> Result<(), String> {
        if !["inline", "page"].contains(&self.answer_mode.as_str())
            || !["draft", "active", "suspended", "trashed"].contains(&self.status.as_str())
            || !self.properties.is_object()
        {
            return Err("Invalid card fields".into());
        }
        if self.status == "active"
            && (self.front.trim().is_empty()
                || (self.answer_mode == "inline" && self.back.trim().is_empty()))
        {
            return Err("An active card needs a question and an answer".into());
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Schedule {
    pub state: String,
    pub due: String,
    pub stability: f64,
    pub difficulty: f64,
    pub elapsed_days: f64,
    pub scheduled_days: f64,
    pub reps: u32,
    pub lapses: u32,
    pub last_review: Option<String>,
    pub learning_steps: u32,
    pub engine: String,
    pub revision: u32,
}

impl Schedule {
    pub fn fresh() -> Self {
        Self {
            state: "new".into(),
            due: chrono::Utc::now().to_rfc3339(),
            stability: 0.0,
            difficulty: 0.0,
            elapsed_days: 0.0,
            scheduled_days: 0.0,
            reps: 0,
            lapses: 0,
            last_review: None,
            learning_steps: 0,
            engine: "legacy-fsrs5".into(),
            revision: 0,
        }
    }

    pub(super) fn due_ms(&self) -> Result<i64, String> {
        chrono::DateTime::parse_from_rfc3339(&self.due)
            .map(|date| date.timestamp_millis())
            .map_err(|_| "Invalid schedule due date".into())
    }

    pub(super) fn validate(&self) -> Result<(), String> {
        if !["new", "learning", "review", "relearning"].contains(&self.state.as_str())
            || !["legacy-fsrs5", "ts-fsrs@5.4.2"].contains(&self.engine.as_str())
        {
            return Err("Unsupported scheduler state or engine".into());
        }
        if [
            self.stability,
            self.difficulty,
            self.elapsed_days,
            self.scheduled_days,
        ]
        .iter()
        .any(|number| !number.is_finite() || *number < 0.0)
            || self.difficulty > 10.0
        {
            return Err("Invalid schedule values".into());
        }
        self.due_ms()?;
        if let Some(date) = &self.last_review {
            chrono::DateTime::parse_from_rfc3339(date).map_err(|_| "Invalid last review date")?;
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub id: String,
    pub page_id: String,
    #[serde(flatten)]
    pub draft: CardDraft,
    pub created_at: i64,
    pub updated_at: i64,
    pub revision: u32,
    pub schedule: Schedule,
}

impl std::ops::Deref for Card {
    type Target = CardDraft;
    fn deref(&self) -> &Self::Target {
        &self.draft
    }
}
