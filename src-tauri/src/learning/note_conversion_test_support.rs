use super::{
    note_memory_fixture::{fixture, id},
    note_write::{Checkpoint, NoteWriteHooks},
    Store,
};
use serde_json::{json, Value};
use std::{collections::BTreeMap, fs};

pub(super) fn setup() -> (tempfile::TempDir, Store) {
    let (directory, store) = fixture();
    store
        .conn
        .execute(
            "UPDATE library_metadata SET value_json='\"ready\"' WHERE key='migrationState'",
            [],
        )
        .unwrap();
    (directory, store)
}
pub(super) fn selection(store: &Store, owner: u128, reuse: Option<u128>) -> Value {
    let preview = super::preview_note_conversion(&store.root, Some(&store.library_id)).unwrap();
    let page = preview
        .pages
        .iter()
        .find(|page| page.page_id.as_deref() == Some(id(owner).as_str()))
        .unwrap();
    json!({"operationId":id(801),"pageId":id(owner),"expectedFingerprint":page.fingerprint,"front":{"kind":"markdown"},"back":{"kind":"inline","source":{"kind":"markdown"}},"memory":reuse.map(|card|json!({"kind":"reuse","cardId":id(card),"confirmedSameGoal":true})).unwrap_or(json!({"kind":"fresh"}))})
}
pub(super) fn apply(
    store: &mut Store,
    selection: Value,
) -> Result<super::NoteConversionResult, String> {
    store.apply_note_conversion(
        serde_json::from_value(selection).map_err(|error| error.to_string())?,
    )
}
pub(super) fn protected(store: &Store) -> BTreeMap<&'static str, String> {
    let mut result = BTreeMap::new();
    for table in [
        "reviews",
        "sessions",
        "library_metadata",
        "page_property_definitions",
        "card_property_definitions",
        "imports",
    ] {
        result.insert(
            table,
            super::note_conversion_cards::rows_fingerprint(
                &store.conn,
                &format!("SELECT * FROM {table} WHERE ?1 IS NOT NULL ORDER BY rowid"),
                "capture",
            )
            .unwrap(),
        );
    }
    result.insert("oldSchedules", super::note_conversion_cards::rows_fingerprint(&store.conn, "SELECT * FROM schedules WHERE card_id IN (SELECT value FROM json_each(?1)) ORDER BY card_id", &json!([id(101),id(102),id(103)]).to_string()).unwrap());
    result
}
pub(super) fn count(store: &Store, table: &str) -> u32 {
    store
        .conn
        .query_row(&format!("SELECT count(*) FROM {table}"), [], |row| {
            row.get(0)
        })
        .unwrap()
}

pub(super) const CHECKPOINTS: [Checkpoint; 7] = [
    Checkpoint::Prepared,
    Checkpoint::Staged,
    Checkpoint::Renamed,
    Checkpoint::FileWritten,
    Checkpoint::Transaction,
    Checkpoint::Applied,
    Checkpoint::Compacted,
];

pub(super) fn pending_dependency(changed: &str) -> (tempfile::TempDir, Store, Vec<u8>) {
    let (directory, mut store) = setup();
    fs::create_dir(directory.path().join("attachments")).unwrap();
    fs::write(
        directory.path().join("attachments/hint.png"),
        b"original bytes",
    )
    .unwrap();
    let source = fs::read_to_string(directory.path().join("lesson.md")).unwrap();
    fs::write(
        directory.path().join("lesson.md"),
        source.replace(
            "# Markdown original",
            "# Markdown original\n![image](attachments/hint.png)",
        ),
    )
    .unwrap();
    let mut choice = selection(&store, 2, Some(101));
    if changed != "identity" {
        choice["back"] = json!({"kind":"page","pageId":id(4),"face":"front"});
    }
    store
        .apply_note_conversion_with_hooks(
            serde_json::from_value(choice).unwrap(),
            &NoteWriteHooks::stop_at(Checkpoint::Prepared),
        )
        .unwrap_err();
    let before = fs::read(directory.path().join("lesson.md")).unwrap();
    (directory, store, before)
}
pub(super) fn change_dependency(changed: &str, root: &std::path::Path, store: &Store) {
    match changed {
        "target" => {
            let path = root.join("nguồn.md");
            fs::write(
                &path,
                fs::read_to_string(&path)
                    .unwrap()
                    .replace("Nguồn", "Changed source"),
            )
            .unwrap();
        }
        "media" => fs::write(root.join("attachments/hint.png"), b"different image bytes").unwrap(),
        "card" => {
            store
                .conn
                .execute(
                    "UPDATE schedules SET stability=50 WHERE card_id=?1",
                    [id(101)],
                )
                .unwrap();
        }
        _ => {
            fs::copy(root.join("lesson.md"), root.join("duplicate.md")).unwrap();
        }
    }
}
