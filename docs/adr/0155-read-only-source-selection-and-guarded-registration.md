# ADR 0155: Read-only source selection and guarded registration

Status: Accepted

## Context

A mnemonic may reference an ordinary Markdown source without enabling learning on that source. The existing ensurePage command may add its UUID and create a verified backup. Calling it merely to select a source makes cancellation write data. UUID-based preview alone cannot display an unregistered file.

## Decision

Provide a library-bound previewNoteSource(path, face) route that runs before Store::open. Reuse ADR0149's verified detached SQLite/WAL copy, validate the existing library identity/schema/ready state, and use existing path, duplicate/pending identity and bounded local-media checks. No original file, DB/WAL or manifest is created or rewritten. Unregistered ordinary files are eligible for explicit static front/back selection. Back-of-linked-back and missing back selections fail; reading a static front never follows body links.

Return separate full-source SHA256 and selection fingerprint. The selection fingerprint covers the selected face, media and back availability/kind, using a Library-relative path. UUID insertion leaves that selection stable. Metadata remains guarded by sourceHash; study receipts continue using the stricter existing live-study fingerprint including source/properties. A selection fingerprint must never be submitted as a study receipt.

Extend ensurePage with optional expectedHash, preserving older callers. New selection Apply uses the captured hash. Reject a changed source before backup/registration; existing backup-first UUID insertion rechecks the source before writing and preserves raw body/properties. Selection and Cancel do not call ensurePage. If registration succeeds and owner configuration later fails, report the partial state and retry honestly; do not claim cancellation undoes an explicitly applied identity. No source activation, grading or new scheduler behavior.

## Consequences

Schema remains5, no dependency or hidden sidecar. Preview copying/hashing occurs on explicit selection, not each keystroke. Browser QA is a text model and does not prove binary media/SQLite preservation. Original-library byte/mtime preservation, guarded registration, backups and no activation are tested through real native commands/files. Default note-learning UI remains staged until M20.
