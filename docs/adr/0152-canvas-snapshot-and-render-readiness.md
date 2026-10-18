---
type: ADR
id: "0152"
title: "Preserved canvas snapshots and explicit document render readiness"
status: active
date: 2026-10-18
---

## Context

An unreadable or unsupported canvas snapshot must not become an empty editable board. Markdown parsing alone does not establish that an embedded board has mounted and loaded, so it cannot safely acknowledge an answer as rendered.

## Decision

Load canvas snapshots without fallback for existing invalid data. Empty/new snapshots remain supported. Failed sources retain their original string and present read-only raw data, copy and retry; retry reloads the same source. No automatic reset, deletion or migration is performed. Document snapshot producers register only for a successfully loaded editable source and preserve the M12 synchronous flush contract.

A document render boundary enumerates expected canvas block identities and aggregates loading/ready/error reports. A canvas reports ready only after successful source load and tldraw mount. Missing, failed or unmounted boards cannot acknowledge a ready document. Markdown parse failures retain raw text and report error without onReady. Generation-scoped parse callbacks and disposed boundaries ignore late completion. The extracted BlockNoteReadOnly remains re-exported from its old module for caller compatibility.

## Consequences

Visual readiness is an additional gate alongside native source/media validation, not a substitute for file fingerprints or a review. Native media validation does not claim to decode every canvas schema/image. Later note study must consume loading/error transitions to revoke prior acknowledgements. Snapshot source bytes and schedule/history remain unchanged. No dependency, storage format, schema version or scheduler algorithm changes.
