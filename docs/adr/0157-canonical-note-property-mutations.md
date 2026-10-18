# ADR 0157: Canonical note property mutations and readonly memory metadata

Status: Accepted

## Context

The legacy frontmatter commands write the note directly. A configured note editor instead owns a canonical two-face source and an immutable source-write queue. Editing a property through the legacy command would leave the editor's committed hash/revision behind, or let a later autosave replace the property. Flat Inspector parsing can also misrepresent opaque YAML as editable text. BOM-prefixed headers were not consistently recognized by listing and Inspector parsing.

## Decision

Route active configured-note property changes through NoteEditorPersistence, the same queue used by content and configuration. Patch one top-level field with the existing header/line boundaries and property aliases; retain every unrelated source byte, opaque YAML and both faces. Reject the owned memory/legacy-schedule namespace at this boundary. Markdown values remain authoritative; existing SQLite property display hints remain separate and retain their own retry behavior.

Stage property/configuration choices synchronously after enqueueing, including while an earlier write awaits a receipt. This ensures subsequent autosaves capture the chosen metadata. A failed editor staging step cancels its queued write. When the queued operation eventually computes its final source against the preceding committed base, remember that echo without reapplying an older choice over newer typing or another property choice. Only validated committed receipts advance base/revision.

Generic native property writers reject reserved memory fields, configured/bound sources and pending note operations. Bulk generic archive preflights the entire affected set before its first write. Unregistered/inactive configured-note bulk actions must be routed through a coordinated workspace service before the M20 default-lane cutover; a generic write is never a fallback. No schema/dependency/scheduler change or cross-Library history transfer is introduced.

Keep existing ordinary/legacy property controls. For configured notes, hide unsupported raw YAML fields from the flat inline editor while keeping them available as protected raw values in Page properties; retain their presence for duplicate/inherited-field detection. Show actual SQLite review schedule as readonly information. Reuse noteCompatibility and immutable conversion snapshots for separately labelled pre-conversion card metadata; copy its original raw properties instead of serializing rounded projections. Viewing/copying this data performs no source write, enable or review action.

Recognize the transport BOM when parsing headers for listing, Inspector and rich-source splitting without rewriting files on read. Native field updates preserve the BOM (M17); the canonical frontend patch preserves unrelated line endings and raw field blocks.

## Consequences

There remains one source persistence pipeline and one editable property authority per note. The readonly Inspector loads on note/Library/reconciliation changes, not on each body keystroke. Its identity checks and scoped async results prevent a previous note's memory from appearing on another note. Existing page-property conversion/focus tests and unconverted legacy card editing remain regressions. Native GUI, default-lane integration, complete fault/performance coverage and normal release hooks remain required by the later plan tasks; targeted tests alone do not establish release completion.
