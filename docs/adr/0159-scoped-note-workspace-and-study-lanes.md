# ADR 0159: Scoped note workspace and independent study lanes

Status: Accepted

## Context

The default note-memory UI needs live binding readiness and counts independently from retained legacy cards. A strict global duplicate-identity scan can reject healthy notes because another UUID is ambiguous. Repeating that scan for each note creates unnecessary Library work. Existing session scopes must remain resumable, including historical review records without an undo receipt.

## Decision

Expose syncNoteWorkspace through the existing Library-bound learning command. Scan source identities once per workspace boundary, exclude ambiguous UUIDs from the unique catalog, and isolate their unavailable/invalid state. Register only identities already present in Markdown. Never assign UUIDs, write Markdown, enable plain notes, convert old cards, or modify schedules because the workspace was opened.

Reconcile explicit note configurations/bindings through the existing immediate SQLite transaction and typed reconciliation receipt. Pending operations remain recoverable and are not reconciled independently. Recheck source bytes before committing. Reuse the source catalog for owner and linked-source validation. Each note transaction commits independently; this is not an all-Library filesystem transaction.

Add an optional notes session lane. Omitted/legacy lane retains the original serialized scope and resumes old sessions. New note sessions select bound cards; legacy sessions select unbound cards. Exclude pending operations only when creating a new queue. Do not remove their positions from existing paused/relearning queues. A historical NULL after_json means no undo receipt; preserve the global latest-review ownership check and never rewrite old history to manufacture a receipt.

Advertise versioned noteMemory/noteStudy/noteWorkspace capabilities in describe. The client supports note memory only when schema5 and all three version1 capabilities are present. This is a packaged API compatibility check, not a remote flag or a migration-ready shortcut.

## Consequences

No schema, dependency, scheduling or XP algorithm change. Backend capabilities do not themselves open the default UI: hook/context/dashboard/entry adoption and acceptance remain M20. The browser text model mirrors state/identity/lane contracts but is not SQLite durability evidence. Malformed note metadata and duplicate identities must remain visible as affected-note issues rather than enabling unsafe fallbacks.
