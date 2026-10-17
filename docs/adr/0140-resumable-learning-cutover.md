---
type: ADR
id: "0140"
title: "Backup-first resumable learning cutover"
status: active
date: 2026-10-17
supersedes: null
---

## Context

Legacy notes and the installation-wide review log must become independent SQLite cards without resetting memory parameters or losing profile data. An interruption can happen between assigning a Markdown page ID and committing its corresponding database rows. A checkpoint stored only outside SQLite would not survive a database backup/restore reliably.

## Decision

Add a transactional schema-v2 `library_metadata` table for database ownership, migration state, an immutable import plan, progress markers, legacy profile/recovery data and the completion report. This completes the already planned stats/import-checkpoint model; it introduces no new product feature. Version-1 databases upgrade without rewriting schedules. Future versions fail safely. The database owner UUID must match the adjacent Library manifest.

A read-only preview supplies source fingerprints. Preparation verifies the preview, creates and verifies the original backup, generates page/card UUIDs once, then commits the plan and `migrating` state together. The plan records source and expected post-ID hashes plus exact card/schedule projections and captured recovery data. No Markdown is changed before that transaction is durable.

Resume processes bounded batches. Each file must match its planned original or post-ID bytes. Identity insertion changes only the owned system line and preserves BOM, comments, indentation and mixed line endings. A page's card/schedule/import marker commit together. A crash after the file write can replay the same planned UUID; committed cards are never overwritten. Finalization verifies the source set, imports only attributable review records idempotently, preserves the available original log/profile for recovery, and commits `ready` plus the report. Repetition counters never fabricate review history. This does not upgrade the scheduler.

The plan lives in SQLite so both current-state backups and partial imports carry their checkpoints. Original pre-migration backups also capture fixed-name legacy log/profile recovery resources and a Library-bound relative review projection map when available; arbitrary paths are never accepted from the frontend. Current-app legacy writes are rejected once migration starts, while source hash checks detect concurrent external changes. No restore overwrites the original Library.

## Consequences

Learning/profile/history/checkpoint data are authoritative user data rather than cache. Migration failures keep user edits and original backups, report conflicts and support resume. Unknown or malformed state is not replaced with empty defaults. Native commands remain scoped to a validated Library and UUID. The final interface must expose progress, retry/resume and recovery without claiming failed or skipped writes succeeded.
