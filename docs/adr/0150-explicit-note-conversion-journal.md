---
type: ADR
id: "0150"
title: "Explicit note conversion with immutable source and memory choices"
status: active
date: 2026-10-18
---

## Context

Legacy SQLite cards and Markdown can disagree. Reusing a schedule for a different learning goal would transfer memory without evidence. Multiple cards, opaque properties, history and interrupted writes must survive conversion. ADR0148's journal already provides atomic file replacement with transactional completion.

## Decision

Conversion accepts one explicitly selected owner per operation, a fresh preview fingerprint, separate article/mnemonic content choices, and either a confirmed same-goal legacy card or a fresh memory. Linked mnemonic selection is an explicit UUID/face; existing inline content is retained. Trashed cards cannot be reused or implicitly restored. Whole-page legacy answers are not silently interpreted as an inline mnemonic.

Preparation creates and verifies a full Library backup before the first persistent operation mutation. It freezes generated IDs, fresh schedule values, the chosen request, both raw Markdown versions, all legacy candidate snapshots/raw property JSON and related state fingerprints into a version1 convert context in the existing journal. Conversion snapshots are never compacted. No extra table/dependency or scheduling/XP algorithm is introduced.

Apply preparation is serialized within the process so duplicate requests do not create independent backups/IDs. Journal preparation validates source/revision/pending state and conversion inputs in an immediate SQLite transaction. File/SQL completion reuses the source coordinator. Pending conversions verify the referenced backup and current owner identity, candidate/session fingerprints and selected media/source dependencies inside the coordinator's operation lock before file mutation. Applied receipts replay first, including after current source or the original backup is unavailable. No resume preflight may overwrite an applied receipt using a stale in-memory checkpoint.

Reuse changes only the selected card's status/revision/update time plus the new binding/journal/source. Its content/properties/hints remain compatibility data, and its schedule/reviews are untouched. Fresh memory creates one empty compatibility card with a fresh schedule; all legacy cards survive. SQL failure rolls back the completion transaction, while retained source intent supports a bounded retry. External changes produce a conflict without force-writing or merging histories. Active related sessions must be explicitly paused before conversion.

## Consequences

Conversion runs one page at a time and reports committed/pending/conflict separately. A normal current-state backup retains completed conversion snapshots in SQLite even if an older referenced backup archive is no longer present after restore; the reference remains historical, not a recursive archive requirement. Pending writes cannot be published as healthy backups (M08). Compatibility details are historical snapshots, not the current note properties. Recovery UI and typed IPC/browser actions are staged separately; default routing opens only after M20's prerequisites.
