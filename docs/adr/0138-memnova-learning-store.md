---
type: ADR
id: "0138"
title: "SQLite learning data with Markdown lesson pages"
status: active
date: 2026-10-17
supersedes: null
---

## Context

Memnova needs multiple independently scheduled cards per lesson page. Legacy `_fsrs_*` note fields represent one card per file and cannot atomically persist a card schedule, review log and session cursor. Rebuilding learning data as a cache would lose user history. Markdown content and attachment paths must remain intact.

## Decision

Use `rusqlite` with bundled native SQLite and its online backup API. Each registered Library contains `.memnova/library.json` (stable UUID) and `.memnova/learning.sqlite3` (authoritative learning data). SQL stays in Rust behind the existing validated vault boundary; frontend IPC accepts typed operations and parameters, never SQL or an arbitrary database filename. Use foreign keys, WAL, a busy timeout, transactions, and monotonic `user_version` migrations. Unknown future schema versions produce an error rather than rebuilding or deleting data.

Pages have UUIDs persisted as `_memnova_page_id` in Markdown. Paths are mutable locators; duplicate IDs are reported as conflicts rather than merging two lessons. Library identity is independent of installation aliases and folder names. Creating IDs in existing notes occurs only after a verified backup during migration. A page may have many cards; each card owns its question, answer mode (inline or live whole-page reference), status, position and vocabulary/media metadata. Drafts and suspended/trashed cards never enter the study queue.

SQLite owns pages, cards, schedules, review records, sessions, decks and import checkpoints. Review operations atomically save the before/after schedule, idempotent review ID and session state. Optimistic revisions reject stale concurrent edits. Resume uses persisted card IDs, and undo only reverts the last eligible review from its exact current state. Stats derive from committed, non-undone review rows.

Backups include a consistent SQLite snapshot, manifest, Markdown and attachment files, plus a file inventory for verification. Restore targets a fresh directory and rejects unsafe paths or damaged files. A migration dry run is read-only. Import is backup-first, resumable and idempotent by source identity, preserves legacy schedules without rescheduling, retains available JSONL history, and never invents review history from repetition counters. Original Markdown and legacy fields remain available for recovery; cutover disables legacy writes only after verification. The scheduler engine upgrade is a separate change after import, with an engine version on schedules/reviews.

## Consequences

SQLite is durable user data and must never be deleted as cache. Git remains an optional advanced capability for Markdown and is not synchronization for an open WAL database. Library copy/export must use the backup path. Markdown editor abstractions remain in place. No cloud sync, cloze, AI generation or image occlusion is introduced by this ADR.

Tests cover migration rollback, foreign keys, future schema rejection, data isolation, idempotency, interrupted import, backup/restore and stale writes. Frontend tests and native QA must cover save failure and recovery before cutover is considered releasable.
