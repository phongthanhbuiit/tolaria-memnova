---
type: ADR
id: "0151"
title: "Explicit keep-current-file resolution without erasing saved drafts"
status: active
date: 2026-10-18
---

## Context

A pending save or conversion can conflict with an external edit, move or deletion. Retrying safely is possible only when current source matches known checkpoints. Clearing a pending guard must not overwrite the current file, erase the saved draft, or fabricate a successful conversion.

## Decision

The user may explicitly choose keepDisk with the operation UUID and a mandatory expected current source hash (explicit null for a missing source). The operation lock and an immediate transaction recheck current path/bytes before and after the resolution. The resolution never writes or recreates a Markdown file. Existing bound memory is reconciled against the kept source without changing schedules/reviews; unbound conversion memory is not reused or created by this action.

The existing operation becomes applied with a distinct discarded outcome and a typed version1 resolution record. This is a terminal decision for that immutable intent, not a committed source save. The record retains the request, current raw source/path/hash, relevant binding revisions and timestamp. Saved draft bytes and conversion before/after/legacy snapshots are not compacted. Exact resolution/save/resume retries replay discarded before reading changed or missing source. An already committed operation cannot be reclassified as discarded. Corrupt or unsupported journals fail closed and require repair/verified-backup recovery outside this action.

No table, schema version, dependency or scheduler algorithm is added. Optional resolution metadata preserves existing payloads. Older builds that do not support this outcome must not be used against the current Library; downgrade requires the pre-upgrade backup restored into a new directory, as already defined in the note-memory plan.

## Consequences

Pending and explicitly resolved draft history are separately discoverable. Read-only recovery views expose the saved draft, current file, kept source snapshot and optional pre-conversion source. A missing/unreadable source is distinct; an unreadable source cannot be silently accepted as missing. Keeping the file does not undo bytes already written by a pending conversion and does not assert the learning goal was converted. The UI must label this action/result distinctly and refresh from durable state without auto-rating or discarding newer editor changes.
