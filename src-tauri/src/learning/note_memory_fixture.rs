//! Synthetic, deterministic data for note-memory preservation tests.
use super::{CardDraft, Store};
use serde_json::json;

pub(super) fn id(value: u128) -> String {
    uuid::Uuid::from_u128(value).to_string()
}

fn source(page: u128, body: &str) -> String {
    format!(
        "---\n_memnova_page_id: {}\ncontext: {{keep: [false, 9007199254740993]}}\n---\n{body}",
        id(page)
    )
}

fn insert_card(store: &mut Store, card: u128, page: u128) {
    store
        .create_card_once(
            &id(card),
            &id(page),
            CardDraft {
                front: format!("SQLite question {card}"),
                back: "Retained answer with Unicode: tế bào".into(),
                answer_mode: "inline".into(),
                answer_page_id: None,
                status: "active".into(),
                position: 0,
                properties: json!({"opaque":{"keep":[false,null]},"topics":["a,b","tế bào"]}),
                property_definitions: None,
            },
        )
        .unwrap();
    store
        .conn
        .execute(
            "UPDATE cards SET created_at=1000,updated_at=1000 WHERE id=?1",
            [id(card)],
        )
        .unwrap();
    store.conn.execute("UPDATE schedules SET state='review',due='2026-10-18T00:00:00Z',due_ms=1792281600000,stability=12,difficulty=4,reps=7,lapses=2,last_review='2026-10-01T00:00:00Z' WHERE card_id=?1", [id(card)]).unwrap();
}

pub(super) fn fixture() -> (tempfile::TempDir, Store) {
    let directory = tempfile::tempdir().unwrap();
    let mut store = Store::open(directory.path()).unwrap();
    for (page, path, body) in [
        (1, "ordinary.md", "# Ordinary note\nNo learning enabled.\n"),
        (
            2,
            "lesson.md",
            "# Markdown original\n\n<!-- FLASHCARD:BACK -->\n\n    Indented mnemonic\n",
        ),
        (3, "multi.md", "# Multiple legacy cards\n"),
        (
            4,
            "nguồn.md",
            "# Nguồn tham khảo\nThis source is not enabled.\n",
        ),
    ] {
        std::fs::write(directory.path().join(path), source(page, body)).unwrap();
        store.register_page(&id(page), path, path).unwrap();
    }
    for (card, page) in [(101, 2), (102, 3), (103, 3)] {
        insert_card(&mut store, card, page);
    }
    store.conn.execute("INSERT INTO sessions(id,scope_json,queue_json,current_index,status,updated_at,revision) VALUES(?1,?2,?3,0,'paused',1000,0)", rusqlite::params![id(501),json!({"pageIds":[id(2)]}).to_string(),json!({"ids":[id(101)],"initialCount":1}).to_string()]).unwrap();
    for (review, undone) in [(901, None), (902, Some(2000))] {
        store.conn.execute("INSERT INTO reviews(id,card_id,session_id,rating,reviewed_at,duration_ms,engine,undone_at) VALUES(?1,?2,?3,3,1000,500,'legacy-fsrs5',?4)", rusqlite::params![id(review),id(101),id(501),undone]).unwrap();
    }
    (directory, store)
}

fn capture_fixture(root: &std::path::Path, store: &Store) {
    let Some(output) = std::env::var_os("MEMNOVA_FIXTURE_EVIDENCE_DIR") else {
        return;
    };
    let output = std::path::PathBuf::from(output);
    std::fs::create_dir_all(&output).unwrap();
    for name in ["ordinary.md", "lesson.md", "multi.md", "nguồn.md"] {
        std::fs::copy(root.join(name), output.join(name)).unwrap();
    }
    store
        .conn
        .backup("main", output.join("fixture.sqlite3"), None)
        .unwrap();
}

#[test]
fn synthetic_fixture_contains_independent_memory_and_conflicting_content() {
    let (directory, store) = fixture();
    let card = store.get_card(&id(101)).unwrap();
    assert_eq!(card.schedule.reps, 7);
    assert_eq!(store.list_cards(Some(&id(3)), false).unwrap().len(), 2);
    assert_eq!(card.properties["topics"][0], "a,b");
    assert!(!std::fs::read_to_string(directory.path().join("lesson.md"))
        .unwrap()
        .contains(&card.front));
    let reviews: i64 = store
        .conn
        .query_row("SELECT COUNT(*) FROM reviews", [], |row| row.get(0))
        .unwrap();
    assert_eq!(reviews, 2);
    let errors: i64 = store
        .conn
        .query_row("SELECT COUNT(*) FROM pragma_foreign_key_check", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(errors, 0);
    capture_fixture(directory.path(), &store);
}

/// Remove only the current note-memory additions before constructing an old schema fixture.
pub(super) fn remove_note_schema(store: &Store) {
    store.conn.execute_batch("DROP TABLE IF EXISTS note_learning_operations; DROP TABLE IF EXISTS note_card_bindings; DROP INDEX IF EXISTS cards_identity_owner;").unwrap();
}
