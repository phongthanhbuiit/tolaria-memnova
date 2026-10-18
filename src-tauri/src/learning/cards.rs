use super::property_definitions::{
    read_definitions, write_definitions, Owner, PropertyDefinitions,
};
use super::{Card, CardDraft, Schedule, Store};
use rusqlite::{params, OptionalExtension, Row, Transaction};

const CARD_SELECT: &str = "SELECT c.*,s.state,s.due,s.stability,s.difficulty,s.elapsed_days,s.scheduled_days,s.reps,s.lapses,s.last_review,s.learning_steps,s.engine,s.revision AS schedule_revision FROM cards c JOIN schedules s ON c.id=s.card_id";

fn row_card(row: &Row<'_>) -> rusqlite::Result<Card> {
    let properties: String = row.get("properties_json")?;
    let parsed = serde_json::from_str(&properties).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(7, rusqlite::types::Type::Text, Box::new(error))
    })?;
    Ok(Card {
        id: row.get("id")?,
        page_id: row.get("page_id")?,
        draft: CardDraft {
            property_definitions: None,
            answer_page_id: row.get("answer_page_id")?,
            front: row.get("front")?,
            back: row.get("back")?,
            answer_mode: row.get("answer_mode")?,
            status: row.get("status")?,
            position: row.get("position")?,
            properties: parsed,
        },
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        revision: row.get("revision")?,
        schedule: Schedule {
            state: row.get("state")?,
            due: row.get("due")?,
            stability: row.get("stability")?,
            difficulty: row.get("difficulty")?,
            elapsed_days: row.get("elapsed_days")?,
            scheduled_days: row.get("scheduled_days")?,
            reps: row.get("reps")?,
            lapses: row.get("lapses")?,
            last_review: row.get("last_review")?,
            learning_steps: row.get("learning_steps")?,
            engine: row.get("engine")?,
            revision: row.get("schedule_revision")?,
        },
    })
}

pub(super) fn read_card(connection: &rusqlite::Connection, id: &str) -> Result<Card, String> {
    let mut card = connection
        .query_row(&format!("{CARD_SELECT} WHERE c.id=?1"), [id], row_card)
        .map_err(|e| e.to_string())?;
    card.draft.property_definitions = Some(read_definitions(connection, Owner::Card, id)?);
    Ok(card)
}

pub(super) fn write_schedule(
    transaction: &Transaction<'_>,
    card_id: &str,
    schedule: &Schedule,
) -> Result<(), String> {
    schedule.validate()?;
    transaction.execute("INSERT INTO schedules(card_id,state,due,due_ms,stability,difficulty,elapsed_days,scheduled_days,reps,lapses,last_review,learning_steps,engine,revision) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14) ON CONFLICT(card_id) DO UPDATE SET state=excluded.state,due=excluded.due,due_ms=excluded.due_ms,stability=excluded.stability,difficulty=excluded.difficulty,elapsed_days=excluded.elapsed_days,scheduled_days=excluded.scheduled_days,reps=excluded.reps,lapses=excluded.lapses,last_review=excluded.last_review,learning_steps=excluded.learning_steps,engine=excluded.engine,revision=excluded.revision", params![card_id,schedule.state,schedule.due,schedule.due_ms()?,schedule.stability,schedule.difficulty,schedule.elapsed_days,schedule.scheduled_days,schedule.reps,schedule.lapses,schedule.last_review,schedule.learning_steps,schedule.engine,schedule.revision]).map_err(|e| e.to_string())?;
    Ok(())
}

pub(super) fn insert_card(
    transaction: &Transaction<'_>,
    id: &str,
    page_id: &str,
    draft: &CardDraft,
    schedule: &Schedule,
) -> Result<(), String> {
    draft.validate()?;
    validate_answer_source(transaction, draft)?;
    super::property_definitions::validate_reference_owners(
        transaction,
        &draft.properties,
        &draft.property_definitions.clone().unwrap_or_default(),
    )?;
    let now = chrono::Utc::now().timestamp_millis();
    transaction.execute("INSERT INTO cards(id,page_id,front,back,answer_mode,status,position,properties_json,created_at,updated_at,answer_page_id) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?9,?10)", params![id,page_id,draft.front,draft.back,draft.answer_mode,draft.status,draft.position,draft.properties.to_string(),now,draft.answer_page_id]).map_err(|e| e.to_string())?;
    write_definitions(
        transaction,
        Owner::Card,
        id,
        &draft.property_definitions.clone().unwrap_or_default(),
    )?;
    write_schedule(transaction, id, schedule)
}

fn validate_answer_source(
    connection: &rusqlite::Connection,
    draft: &CardDraft,
) -> Result<(), String> {
    if let Some(id) = &draft.answer_page_id {
        uuid::Uuid::parse_str(id).map_err(|_| "Invalid answer page identity")?;
        let exists: bool = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM pages WHERE id=?1)",
                [id],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if !exists {
            return Err("Answer source is not registered in this Library".into());
        }
    }
    Ok(())
}

impl Store {
    pub fn create_card(&mut self, page_id: &str, draft: CardDraft) -> Result<Card, String> {
        self.create_card_once(&uuid::Uuid::new_v4().to_string(), page_id, draft)
    }

    pub fn create_card_once(
        &mut self,
        id: &str,
        page_id: &str,
        draft: CardDraft,
    ) -> Result<Card, String> {
        let mut draft = draft;
        draft
            .property_definitions
            .get_or_insert_with(PropertyDefinitions::new);
        self.ensure_card_writes_allowed()?;
        uuid::Uuid::parse_str(id).map_err(|_| "Invalid card creation identity")?;
        draft.validate()?;
        let transaction = self
            .conn
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        super::note_guard::require_note_page_writable(&transaction, page_id)?;
        let exists: bool = transaction
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM cards WHERE id=?1)",
                [id],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        if exists {
            require_unbound_card(&transaction, id)?;
            let card = read_card(&transaction, id)?;
            if card.page_id != page_id || card.draft != draft {
                return Err(
                    "Card creation identity is already in use; existing data was preserved".into(),
                );
            }
        } else {
            insert_card(&transaction, id, page_id, &draft, &Schedule::fresh())?;
        }
        transaction.commit().map_err(|error| error.to_string())?;
        self.get_card(id)
    }

    pub fn get_card(&self, id: &str) -> Result<Card, String> {
        read_card(&self.conn, id)
    }

    pub fn list_cards(
        &self,
        page_id: Option<&str>,
        include_trashed: bool,
    ) -> Result<Vec<Card>, String> {
        let sql = format!("{CARD_SELECT} WHERE (?1 IS NULL OR c.page_id=?1) AND (?2 OR c.status!='trashed') ORDER BY c.page_id,c.position,c.created_at,c.id");
        let mut statement = self.conn.prepare(&sql).map_err(|e| e.to_string())?;
        let cards = statement
            .query_map(params![page_id, include_trashed], row_card)
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string());
        cards?
            .into_iter()
            .map(|mut card| {
                card.draft.property_definitions =
                    Some(read_definitions(&self.conn, Owner::Card, &card.id)?);
                Ok(card)
            })
            .collect()
    }

    pub fn update_card(
        &mut self,
        id: &str,
        revision: u32,
        draft: CardDraft,
    ) -> Result<Card, String> {
        self.ensure_card_writes_allowed()?;
        let transaction = self
            .conn
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .map_err(|error| error.to_string())?;
        require_unbound_card(&transaction, id)?;
        let current = read_card(&transaction, id)?;
        let draft = normalize_legacy_update(&transaction, &current, draft)?;
        if current.revision == revision.saturating_add(1) && current.draft == draft {
            return Ok(current);
        }
        if current.status == "trashed" {
            let mut restored = current.draft.clone();
            restored.status = "draft".into();
            if draft != restored {
                return Err("Restore a trashed card to Draft before editing".into());
            }
        }
        let changed = transaction.execute("UPDATE cards SET front=?1,back=?2,answer_mode=?3,status=?4,position=?5,properties_json=?6,updated_at=?7,answer_page_id=?10,revision=revision+1 WHERE id=?8 AND revision=?9", params![draft.front,draft.back,draft.answer_mode,draft.status,draft.position,draft.properties.to_string(),chrono::Utc::now().timestamp_millis(),id,revision,draft.answer_page_id]).map_err(|e| e.to_string())?;
        if changed != 1 {
            return Err("Card changed in another window; reload before saving".into());
        }
        write_definitions(
            &transaction,
            Owner::Card,
            id,
            &draft.property_definitions.unwrap_or_default(),
        )?;
        transaction.commit().map_err(|error| error.to_string())?;
        self.get_card(id)
    }

    pub fn clone_card(&mut self, id: &str) -> Result<Card, String> {
        let _operation = super::migration_import::MIGRATION_OPERATION
            .lock()
            .map_err(|error| error.to_string())?;
        require_unbound_card(&self.conn, id)?;
        let card = self.get_card(id)?;
        if card.status == "trashed" {
            return Err("Restore a trashed card before cloning".into());
        }
        let mut draft = card.draft;
        draft.status = "draft".into();
        self.create_card(&card.page_id, draft)
    }
}

fn require_unbound_card(connection: &rusqlite::Connection, id: &str) -> Result<(), String> {
    let bound = is_bound_card(connection, id)?;
    if bound {
        return Err("bound-note-card: open the note editor".into());
    }
    let page: Option<String> = connection
        .query_row("SELECT page_id FROM cards WHERE id=?1", [id], |row| {
            row.get(0)
        })
        .optional()
        .map_err(|error| error.to_string())?;
    if let Some(page) = page {
        super::note_guard::require_note_page_writable(connection, &page)?;
    }
    Ok(())
}

fn is_bound_card(connection: &rusqlite::Connection, id: &str) -> Result<bool, String> {
    connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM note_card_bindings WHERE card_id=?1)",
            [id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())
}

impl Store {
    pub fn list_legacy_cards(
        &self,
        page_id: Option<&str>,
        include_trashed: bool,
    ) -> Result<Vec<Card>, String> {
        self.list_cards(page_id, include_trashed)?
            .into_iter()
            .filter_map(|card| match is_bound_card(&self.conn, &card.id) {
                Ok(false) => Some(Ok(card)),
                Ok(true) => None,
                Err(error) => Some(Err(error)),
            })
            .collect()
    }
}

fn normalize_legacy_update(
    connection: &rusqlite::Connection,
    current: &Card,
    draft: CardDraft,
) -> Result<CardDraft, String> {
    let mut draft = draft;
    if draft.property_definitions.is_none() {
        draft.property_definitions = current.property_definitions.clone();
    }
    super::property_precision::preserve_legacy_numbers(&mut draft.properties, &current.properties);
    draft.validate()?;
    validate_answer_source(connection, &draft)?;
    super::property_definitions::validate_reference_owners(
        connection,
        &draft.properties,
        &draft.property_definitions.clone().unwrap_or_default(),
    )?;
    Ok(draft)
}
