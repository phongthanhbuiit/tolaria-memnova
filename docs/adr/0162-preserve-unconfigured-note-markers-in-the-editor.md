# ADR-0162: preserve unconfigured note markers through the durable editor pipeline

Status: accepted. Date:2026-10-19. Relates to ADR0147/0154.

## Context

A real-file M22 regression showed that editing an ordinary, unconfigured note silently removed its standalone `<!-- FLASHCARD:BACK -->` comment. The note was correctly not split/enabled, but BlockNote's Markdown UI parser discarded the HTML comment before serialization. Reinserting a comment by approximate text matching would relocate it or undo an intentional raw-mode deletion.

## Decision

Reuse the existing durable-block preprocessing/serialization pipeline for this one recognized marker. The shared pure boundary scanner masks standalone marker lines outside fences/comments/inline code; an internal literalNoteMarker block retains their source representation and serializes the original comment at its document position. It renders as a hidden source comment, introduces no new user action, and can be edited/deleted through raw Markdown. Enabled note face projections already omit their structural separator, so they continue using the canonical document patcher.

This is an internal renderer representation only: no SQLite schema, frontmatter key, on-disk format, hidden folder, dependency, learning opt-in or scheduler change. Other arbitrary HTML comments remain under the pre-existing editor behavior; this decision does not claim general lossless HTML editing. Explicit raw removal is authoritative; no save-time blind reinsertion.

## Consequences and verification

Unit tests cover durable round trip and fenced literal examples. The file-backed browser regression edits an ordinary note and verifies the comment, both neighboring paragraphs, absence of owned identity/configuration, and absence of a mnemonic tab; ordinary entry stays unchanged on opening learning controls. Existing two-face editor, raw switch, durable canvas and native acceptance must be rerun after this shared editor change. Clipboard external HTML emits escaped text, never executes stored source as HTML.
