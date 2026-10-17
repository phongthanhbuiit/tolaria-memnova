# ADR-0146: Property writes and exact update retries

Date: 2026-10-18. Status: accepted. Complements ADR-0145.

Card values, optional editor definitions and card revision are committed in one immediate SQLite transaction. Missing definitions in a legacy update mean retain the current definitions; missing definitions on creation mean an empty map. Reads expose current definitions. Definitions validate kinds, list item kinds, keys, typed values and registered same-Library references. Clone keeps definitions with a new card identity and fresh memory.

A response can disappear after commit. An update with expected revision R may return the current card without a second write only when its current revision is R+1 and its complete canonical draft equals the requested draft. A different stale payload still fails. This does not claim that the original client made the intervening write; it establishes that the exact desired state already exists. Schedule/review writes remain separate and unchanged. Retrying an already trashed identical draft performs no mutation; editing a trashed card still requires unchanged Restore to Draft.

Page type hints use expected-map compare-and-swap by page UUID in the bound Library. A request whose desired map already equals the current map is an idempotent acknowledgement. It never writes Markdown. Page adapters must await the existing Markdown save pipeline before writing hints, retain acknowledged progress on partial failure, and retry hints without reapplying page writes. Filesystem and SQLite do not form one atomic transaction.

Legacy property integers beyond JavaScript's exact range remain read-only. During unrelated card updates, the store preserves original integers when the incoming numeric projection is unchanged, recursively inside opaque objects/arrays. Explicit removal still removes a key. New typed numbers must be finite and, when integral, exactly representable in JavaScript. This protects old values without changing storage format or copying values into hint tables.
