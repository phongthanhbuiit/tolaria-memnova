---
type: ADR
id: "0145"
title: "Linked answer pages and independent editable properties"
status: active
date: 2026-10-18
supersedes: "0138 (answer sources), 0142 (card property interfaces)"
---

## Context

A normal Markdown note may be an answer source for a card managed on another page. Page and card metadata must stay independently editable, including legacy arrays and unknown nested values. Source changes must not silently grade unseen content. Backup discovery must survive application restart.

## Decision

Keep cards.page_id as owner. Add nullable answer_page_id referencing pages.id in schema v3. Inline mode requires null source and uses back; page mode with null uses the owner; page mode with an ID uses that same-Library page. Preserve back when changing mode. Source changes increment card revision without changing schedule. Clone preserves content/source/metadata and starts Draft with fresh identity/memory. Trash can only be restored to Draft with unchanged content.

StudyItem.page remains the owner. Add optional answerPage and sourceError; RateRequest adds optional answerFingerprint. Missing optional fields deserialize to None, preserving historical receipts. Newly displayed linked answers require both owner and source fingerprints; self-page and inline requests retain their previous owner-only contract. Receipt replay precedes current source validation. Missing source blocks new ratings and offers reload/skip/relink. Resolve question/inline media against owner; linked answer media against source. UUIDs, not mutable paths or titles, bind references.

Schema v4 adds page_property_definitions(page_id,key,value_kind,item_kind) and card_property_definitions(card_id,key,value_kind,item_kind), with owner foreign keys and composite primary keys. Value kinds are text, number, boolean, date, list, page; list item kind is text or page, otherwise null. No inferred definitions are bulk-written. Definitions are editor hints, never a second copy of Markdown values. Date is a validated Gregorian YYYY-MM-DD without timezone conversion. Only finite numbers are accepted. Unrecognized/mismatched legacy values remain visible read-only and round-trip unchanged.

CardDraft adds optional answerPageId and optional propertyDefinitions. Absence preserves existing definitions on update; creation absence means empty definitions. Explicit empty definitions clears hints. Card values, explicit hints, revision and source validation commit together. Page hint API uses pageId and complete definitions; page value writes retain the existing Markdown save pipeline, followed by hint save. Failed hint save reports partial success and retries hints only. No filesystem/SQLite atomicity is promised. Page edits remain available before learning migration.

Each definition is {valueKind,itemKind?}. New property keys trim whitespace, must be 1–256 UTF-8 bytes and cannot start with underscore or equal (case insensitive) id, revision, schedule, pageId, answerPageId, createdAt, updatedAt. Status remains a valid user property, separate from card lifecycle. Existing reserved/custom keys are preserved, but cannot be added through the new editor. New definitions have at most 256 entries and only target keys actually present on a card; page hints may outlive external key deletion and are ignored until a matching value exists. Oversized existing values are not truncated. Values are never coerced on read. Explicit conversions support lossless text/number/boolean/date/list transformations only; incompatible changes fail and retain the old value. Rename rejects any exact key collision and preserves Unicode spelling.

New card page property values are {pageId,label?} or arrays thereof, interpreted as references only with a page/list-page hint. Page properties retain frontmatter/wiki-link representations. Legacy vocabulary strings, arrays, aliases and arbitrary fragments retain their raw values; unsupported shapes disable destructive relation editing. New reference selection is UUID-backed and title/path-disambiguated. Do not automatically convert historical relations.

Expose listBackups and verifyBackup with ID-only requests. List returns [{id,descriptor?,error?}], checking manifest readability/identity but not claiming full verification. Restore verifies again and writes a fresh directory. Corrupt entries do not hide healthy entries. Ignore incomplete/non-UUID directories and never follow symlinks. Neither backup deletion nor cross-Library restore discovery is introduced.

## Consequences

No scheduler/XP change, property inheritance, cloud sync, generic schema builder or arbitrary SQL IPC. New fields are optional for compatibility; descriptors, browser fixtures and backup verification support v3/v4. Upgrades take a verified snapshot before altering an existing database. Future versions fail closed. Tests cover legacy receipt replay, source rename/replacement, interrupted migrations, metadata round-trip, stale writes, hint partial failure and persisted backup discovery. All new UI uses existing shadcn/theme/localization primitives and safe analytics enums/counts.
