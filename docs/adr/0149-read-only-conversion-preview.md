---
type: ADR
id: "0149"
title: "Read-only note conversion previews from detached SQLite snapshots"
status: active
date: 2026-10-18
---

## Context

Conversion must show Markdown and historical card alternatives before choosing content or memory identity. Store::open creates metadata and can upgrade older schemas, so it cannot serve an unopened read-only preview. SQLite WAL visibility also matters; immutable reads of the database file alone can miss committed WAL data, while ordinary read-only WAL connections may need auxiliary files.

## Decision

A dedicated preview route validates the Library boundary and optional existing UUID without opening Store. It captures database and optional WAL files into an OS temporary directory, verifies copied bytes and the unchanged source inventory, then opens the detached database read-only. The source identity/database/WAL are checked again before returning. Concurrent changes fail closed for a bounded retry by the caller; no polling loop or current-state backup is created. The detached connection closes before its temporary directory is deleted. No library schema or dependency is added.

Uninitialized, import-required, upgrade-required and recovery-required storage are distinct from ready conversion state. Old schemas are not upgraded during preview. Source files are scanned read-only, retaining full raw frontmatter and byte fingerprints. Missing/malformed/duplicate sources remain visible. Historical candidates retain raw properties JSON, typed hints/schedules and complete-row storage fingerprints, including review/import data. A page also fingerprints related session state, page metadata/hints and binding.

Matching article/mnemonic bytes can suggest a card identity but never select or reuse its schedule. Whole-page legacy semantics receive no inferred equivalence. Multiple cards and trashed survivors remain explicit. Markdown/card content conflicts, pending recovery and existing bindings are represented separately. Apply must revalidate an explicit selection against fresh state and obtain a verified backup in the later conversion-runner task.

## Consequences

Preview allocates temporary disk space and reads source/database bytes at an explicit action boundary; it never runs on each keystroke. It creates no persistent UUID, journal, backup, schedule or review. Browser QA can model text/identity decisions but cannot certify SQLite, raw numeric representation or binary media; native tests provide that evidence. The existing legacy importer and its backup/resume workflow remain separate.
