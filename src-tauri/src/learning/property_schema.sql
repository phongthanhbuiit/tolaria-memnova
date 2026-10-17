CREATE TABLE page_property_definitions (
 page_id TEXT NOT NULL REFERENCES pages(id),
 key TEXT NOT NULL,
 value_kind TEXT NOT NULL CHECK(value_kind IN ('text','number','boolean','date','list','page')),
 item_kind TEXT,
 PRIMARY KEY(page_id,key),
 CHECK((value_kind='list' AND item_kind IS NOT NULL AND item_kind IN ('text','page')) OR (value_kind<>'list' AND item_kind IS NULL))
);
CREATE TABLE card_property_definitions (
 card_id TEXT NOT NULL REFERENCES cards(id),
 key TEXT NOT NULL,
 value_kind TEXT NOT NULL CHECK(value_kind IN ('text','number','boolean','date','list','page')),
 item_kind TEXT,
 PRIMARY KEY(card_id,key),
 CHECK((value_kind='list' AND item_kind IS NOT NULL AND item_kind IN ('text','page')) OR (value_kind<>'list' AND item_kind IS NULL))
);
PRAGMA user_version=4;
