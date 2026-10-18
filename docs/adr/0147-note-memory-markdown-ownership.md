---
type: ADR
id: "0147"
title: "Markdown ownership of note memory faces"
status: active
date: 2026-10-18
supersedes: "0138, 0142 and 0145 for the content ownership of explicitly converted note-memory cards only"
---

## Context

Memnova is a note-taking app with optional learning. A selected Markdown article is the material to remember, and its reverse face provides images, prose or an embedded whiteboard as mnemonic support. Independent SQLite Q/A cards remain user data but are not the intended default for newly enabled articles. Re-enabling the legacy editor alone would leave two independently editable copies and bypass the durable learning store.

## Decision

A note-memory document owns both faces and versioned activation/source configuration in Markdown. Its existing page UUID identifies the article. Inline reverse content follows the existing standalone `<!-- FLASHCARD:BACK -->` line. Existing tldraw fenced-block persistence remains the board format; no sidecar canvas folder or new dependency is introduced. A linked reverse source identifies a same-Library page UUID and a selected face. It does not activate or grade that source.

The pure codec reports UTF-8 ranges, configuration and diagnostics without IO. Delimiters inside fences, inline code, frontmatter and HTML comments are literal content. Multiple structural delimiters and unsupported owned configuration fail closed for face/configuration patches. JavaScript-only character offsets are explicitly separate from portable byte ranges. A shared golden corpus defines frontend/native parity.

Owned fields are `_memnova_learning_version`, `_memnova_learning_enabled`, `_memnova_back_kind`, `_memnova_back_page_id` and `_memnova_back_face`. They use the canonical scalar syntax documented in the implementation plan; ambiguous/quoted/indented owned key declarations are not silently promoted by the restricted codec. Unknown user frontmatter is retained as raw text rather than parsed into a lossy object. A no-op returns original bytes, changing one face retains the other, and configuration changes patch only owned values actually changed. Existing `_fsrs_*` fields remain recoverable legacy input and are not the new schedule authority.

SQLite continues owning memory, reviews and sessions. Subsequent tasks add a one-to-one page/card binding and recoverable operation journal with backup-first additive schema migration. Bound cards resolve current Markdown content; their old SQLite content/properties remain recovery snapshots. Unbound legacy cards keep their existing semantics. Conversion requires a verified backup and explicit conflict/reuse choices; it never merges histories or resets an existing schedule silently. ADR-0140 recovery, ADR-0141 scheduling and ADR-0146 exact-write/retry guarantees remain applicable.

This initial checkpoint introduces the codec and fixtures only. Runtime routing, schema migration, native resolver and note editor adoption are staged tasks M02–M20; until those gates pass, the existing application routes remain unchanged. No automatic migration is caused by importing this module.

## Consequences

Ordinary notes do not become learning items from a folder, link or marker alone. Memory aids travel with the document, while attachments still require Library backup/copy. Markdown outside Memnova may display board snapshot JSON instead of an interactive board. Future independent canvas storage requires a separate decision covering assets, watching, Git, backup and identity.

The new file format does not make the scheduler database disposable. Cross-file/SQLite saves require explicit expected-source checks and resumable journal semantics; they are not a shared transaction. Legacy SQL edits cannot remain a second writer for a bound note. The existing legacy splitter stays available for compatibility until explicit conversion and editor routing are ready.
