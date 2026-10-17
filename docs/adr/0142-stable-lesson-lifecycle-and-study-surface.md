---
type: ADR
id: "0142"
title: "Stable lesson lifecycle and independent card interfaces"
status: active
date: 2026-10-17
supersedes: null
---

## Context

Lesson editing must remain separate from individual cards. File replacement during UUID assignment changes filesystem birth metadata, and a stale editor buffer can omit that new UUID. Recreating a deleted filename must not attach old cards/history to a different lesson. A lost card-creation response must not create duplicates. Source files and backup internals must not become interchangeable note-editing targets.

## Decision

Add Content/Flashcards tabs to the existing editor, preserve the full lesson after cutover, and keep card content/status/media in SQLite. Existing editor/schema/Markdown rendering utilities remain in use; rendering failure exposes the original text rather than an empty answer. Grading waits for question and answer rendering. The study surface calls the already versioned scheduler/session API and retains an uncertain review request until replay or explicit state reload.

Register external/new lessons through validated relative paths. Missing IDs are assigned after a verified backup, with a durable registry identity and logical source timestamps so retries reuse the same identity. Normal editor saves preserve the registered UUID; creating/copying a new note generates a fresh UUID. Page synchronization follows on-disk UUIDs across renames, reports duplicates and retires deleted/replaced locators without deleting their cards or history. Restoring that original UUID can revive the same lesson. Recorded logical creation dates are projected into the note list/editor; current modification dates stay filesystem-based.

Use the existing metadata table for recovery timestamps/retired locators; no new schema tables are introduced. UUID-bound native operations expose pages, stats and daily goals. New review statistics include committed, non-undone rows. Known legacy activity fills missing baseline history without adding it twice: use the greater recorded legacy count for each day, then add new reviews. Legacy log rows never mint XP. Card creation optionally accepts a stable UUID to replay the same creation intent without resetting memory or overwriting a conflicting card.

Native learning operations alone own `.memnova`. Generic note/file commands reject that reserved subtree. Backups restore into fresh directories and use the existing Library-registration path to open the result.

## Consequences

A lesson owns many independent cards, including live whole-page answers. Drafts, suspension and reversible trash preserve schedules; clones start fresh. Deck scopes include the root lesson and descendants and never fall back to other cards. Dashboard counters derive from SQLite cards/reviews. The browser fixture implements the transport for UI QA only; it is not a production storage alternative and does not substitute for native SQLite QA. New user actions emit only safe counts/modes/status/rating metadata.
