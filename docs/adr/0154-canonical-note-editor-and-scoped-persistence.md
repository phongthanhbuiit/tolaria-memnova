# ADR 0154: Canonical note editor and scoped persistence

Status: Accepted

## Context

A note-memory target stores its article and mnemonic in one Markdown source. The legacy editor face splitter trims/joins slices and its tab swap guard treats local content as pending until echoed by the parent. Changing faces at the same path can therefore leave the old face visible. Generic file saving also bypasses the native journal required for a bound note.

## Decision

Use NoteEditorDocument for a single canonical source per Library/path visit. Face views include the original header for the existing rich serializer, while the codec patches only the active body range. Ordinary notes keep their complete source, including literal markers. Configured disabled notes retain both editable faces. Raw mode reads the canonical document after explicit canvas/rich flush; raw edits update that same document. Local edits are synchronous, known parent echoes cannot roll them back, and external changes preserve a dirty draft for copying/conflict resolution.

Use a scoped NoteEditorPersistence registration at the existing persistContent boundary, shared by autosave, explicit save and navigation fallback. Capture the originally loaded source hash; never substitute a later disk hash. Serialize immutable write intents, retry an uncertain intent before any newer draft, and advance the source/revision only for a validated committed receipt. Pending, conflict and discarded receipts remain unsaved. Generic writes to a configured source without a registered writer fail closed. Native identity/hash/revision checks remain authoritative.

A projected face has its own editor view identity at the same filesystem path. Reset only the outgoing face's pending echo/cache and invalidate outdated parsing. Suppress edits to the old document until replacement; keep the old view inert and hidden until the existing applied-swap acknowledgement. Rotate editor resource visits on face changes so delayed image imports cannot cross faces, even with repeated board IDs. The existing editor width, image/whiteboard actions and one autosave pipeline remain in use.

## Consequences

No schema, dependency, scheduler or default conversion entry changes. Legacy cards retain their existing editor path. Linked-back selection/preview follows in M16; the owner domain rejects attempts to edit a linked mnemonic. Task M20 opens the default note-learning entry after its dependencies. Native combined acceptance and the full release gates remain required; unit/browser models alone do not prove native persistence.
