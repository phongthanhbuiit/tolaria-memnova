---
type: ADR
id: "0141"
title: "Versioned maintained scheduler and transactional study sessions"
status: active
date: 2026-10-17
supersedes: null
---

## Context

Import must preserve FSRS-5 memory and due dates unchanged. After cutover, independently scheduled cards need a maintained scheduler, short learning steps and durable review/session transactions. A lost IPC response must not double-grade a card. A failed persistence operation must not grant XP or advance the queue.

## Decision

Pin `ts-fsrs` 5.4.2 as a frontend scheduling dependency behind a pure adapter. Use its default FSRS-6 weights, 90% requested retention, deterministic scheduling with fuzz disabled, learning steps 1/10 minutes and a 10-minute relearning step. The adapter preserves counters and memory inputs and validates them before calculation. Import/read operations never invoke it: an imported schedule keeps its old engine and exact due date until its next deliberate rating. Persist engine and learning-step position with every result. Preview uses the same adapter and review timestamp as the selected outcome.

Rust remains the learning authority. Session queues persist stable card UUIDs and scope; an explicit empty scope stays empty. A rating carries a stable review UUID, expected session/card/schedule revisions, the displayed source fingerprint and its versioned outcome. An immediate transaction validates current state and writes schedule, before/after snapshots, review and queue cursor together. A replay of the same committed request returns current durable state; reusing an ID for different data fails. Raw note content is never sent to analytics.

Learning/relearning outcomes reinsert the card at its actual due time. Ready work is selected ahead of waiting work without changing the processed queue prefix. A session with pending future work stays active and reports its next deadline, rather than claiming completion. Resume loads that persisted queue. Pausing never erases work.

Undo restores only the latest eligible committed review and requires unchanged schedule/session revisions. It marks the review undone, restores the previous memory with a new revision (avoiding ABA), rewinds the cursor and removes the corresponding reinserted work. Statistics count only committed, non-undone new reviews plus the preserved legacy baseline; imported historical rows do not grant legacy XP twice.

## Consequences

The old handwritten scheduler remains only for legacy compatibility tests/import types until UI retirement. No bulk rescheduling, optimizer, parameter training, network service or new product mode is introduced. Changing the pinned engine/configuration requires a deliberate versioned change. SQLite backups carry sessions and undo/history state. Focused tests cover four outcomes, learning-step progression, idempotency, rollback, stale writes, scope, waiting, resume and undo; final UI/native QA must additionally verify mouse and keyboard behavior.
