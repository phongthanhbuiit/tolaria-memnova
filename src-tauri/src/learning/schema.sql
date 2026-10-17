CREATE TABLE pages (
  id TEXT PRIMARY KEY NOT NULL,
  path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  deleted_at INTEGER
);
CREATE TABLE cards (
  id TEXT PRIMARY KEY NOT NULL,
  page_id TEXT NOT NULL REFERENCES pages(id),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  answer_mode TEXT NOT NULL CHECK(answer_mode IN ('inline','page')),
  status TEXT NOT NULL CHECK(status IN ('draft','active','suspended','trashed')),
  position INTEGER NOT NULL CHECK(position >= 0),
  properties_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0)
);
CREATE INDEX cards_page ON cards(page_id,status,position);
CREATE TABLE schedules (
  card_id TEXT PRIMARY KEY NOT NULL REFERENCES cards(id),
  state TEXT NOT NULL CHECK(state IN ('new','learning','review','relearning')),
  due TEXT NOT NULL,
  due_ms INTEGER NOT NULL,
  stability REAL NOT NULL CHECK(stability >= 0),
  difficulty REAL NOT NULL CHECK(difficulty >= 0 AND difficulty <= 10),
  elapsed_days REAL NOT NULL CHECK(elapsed_days >= 0),
  scheduled_days REAL NOT NULL CHECK(scheduled_days >= 0),
  reps INTEGER NOT NULL CHECK(reps >= 0),
  lapses INTEGER NOT NULL CHECK(lapses >= 0),
  last_review TEXT,
  learning_steps INTEGER NOT NULL DEFAULT 0 CHECK(learning_steps >= 0),
  engine TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX schedules_due ON schedules(due_ms,card_id);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  scope_json TEXT NOT NULL,
  queue_json TEXT NOT NULL,
  current_index INTEGER NOT NULL CHECK(current_index >= 0),
  status TEXT NOT NULL CHECK(status IN ('active','paused','completed')),
  updated_at INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE reviews (
  id TEXT PRIMARY KEY NOT NULL,
  card_id TEXT NOT NULL REFERENCES cards(id),
  session_id TEXT REFERENCES sessions(id),
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 4),
  reviewed_at INTEGER NOT NULL,
  duration_ms INTEGER CHECK(duration_ms >= 0),
  before_json TEXT,
  after_json TEXT,
  engine TEXT NOT NULL,
  undone_at INTEGER
);
CREATE INDEX reviews_history ON reviews(card_id,reviewed_at);
CREATE INDEX reviews_stats ON reviews(reviewed_at,undone_at);
CREATE TABLE decks (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  root_page_id TEXT UNIQUE REFERENCES pages(id)
);
CREATE TABLE deck_pages (
  deck_id TEXT NOT NULL REFERENCES decks(id),
  page_id TEXT NOT NULL REFERENCES pages(id),
  PRIMARY KEY(deck_id,page_id)
);
CREATE TABLE imports (
  source_key TEXT PRIMARY KEY NOT NULL,
  card_id TEXT NOT NULL REFERENCES cards(id),
  source_fingerprint TEXT NOT NULL,
  imported_at INTEGER NOT NULL
);
PRAGMA user_version = 1;
