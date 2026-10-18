---
type: ADR
id: "0148"
title: "Additive note memory binding and recovery journal"
status: active
date: 2026-10-18
supersedes: "0138, 0142 and 0145 only for the storage of explicitly bound note-memory documents"
---

## Context

ADR-0147 assigns article and mnemonic content to Markdown. Existing SQLite card identities, schedules, reviews and opaque properties must survive that transition. File replacement and SQLite completion cannot share one transaction, so later save/conversion tasks require durable intent and replay state.

## Decision

Schema v5 adds only `note_card_bindings` and `note_learning_operations`. A unique page binding and unique card binding keep one learning identity per selected note. A composite foreign key against the indexed existing `(cards.id,cards.page_id)` pair enforces matching ownership in SQLite itself. No cascading deletion or changes to schedules/reviews are introduced. Source hashes are canonical lowercase SHA-256 and revisions nonnegative.

The journal accepts only configure/save/reconcile/convert operations, prepared/file_written/applied/conflict phases and JSON payloads with integer version 1. Typed native models define these states; later coordinator tasks validate complete immutable payloads before persistence. No caller-supplied SQL or arbitrary journal JSON is exposed through IPC.

The existing backup-first Store upgrade creates and verifies a pre-upgrade snapshot, then adds both tables/indexes in one transaction. The schema version changes only within that transaction. Existing migrations remain unchanged; unexpected table collisions fail and roll back instead of being treated as a successful upgrade. Older backups remain valid and upgrade in a restored directory when opened.

## Consequences

Upgrade changes no Markdown bytes or mtimes, binds no cards, and does not convert content. Historical card rows remain recovery snapshots; their history stays keyed by the same card identity. Runtime note saves, reconciliation, conversion and UI activation are separate staged tasks, not side effects of opening a v5 Store. ADR-0140 recovery, ADR-0141 scheduling and ADR-0146 receipt guarantees remain in force. Applied ordinary-save payload bytes will be compacted by the coordinator while preserving exact retry identity/outcome; pending/conflict and conversion snapshots must remain recoverable.
