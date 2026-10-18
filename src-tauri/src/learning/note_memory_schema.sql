CREATE UNIQUE INDEX cards_identity_owner ON cards(id,page_id);
CREATE TABLE note_card_bindings (
 page_id TEXT PRIMARY KEY NOT NULL REFERENCES pages(id),
 card_id TEXT NOT NULL UNIQUE,
 source_hash TEXT NOT NULL CHECK(length(source_hash)=64 AND source_hash NOT GLOB '*[^0-9a-f]*'),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
 FOREIGN KEY(card_id,page_id) REFERENCES cards(id,page_id)
);
CREATE TABLE note_learning_operations (
 id TEXT PRIMARY KEY NOT NULL,
 page_id TEXT REFERENCES pages(id),
 kind TEXT NOT NULL CHECK(kind IN ('configure','save','reconcile','convert')),
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json) AND (json_type(payload_json,'$.version') IS 'integer') AND (json_extract(payload_json,'$.version') IS 1)),
 phase TEXT NOT NULL CHECK(phase IN ('prepared','file_written','applied','conflict')),
 created_at INTEGER NOT NULL CHECK(created_at>=0)
);
CREATE INDEX note_operations_pending ON note_learning_operations(phase,created_at);
PRAGMA user_version=5;
