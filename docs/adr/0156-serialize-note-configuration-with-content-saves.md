# ADR 0156: Serialize note configuration with content saves

Status: Accepted

Extends ADR0154 and ADR0155.

## Context

Changing a mnemonic source can overlap delayed canvas edits and autosave. A separate configuration write can invalidate the source hash/revision of the editor writer, lose a newer body if it replaces the whole local source, or mistake a partially written own configuration for an external edit.

## Decision

Use the same NoteEditorPersistence queue for saveNoteMemory and configureNoteMemory. Clone the configuration before queuing, derive its expected source from the writer's last committed base, and keep its tagged immutable intent for exact retry. Pending/conflict/discarded outcomes cannot advance the base or mark a draft saved. Verify operation/page/source-hash receipts and visit generation before adopting committed state.

An explicit configuration Apply stages only the owned configuration fields in the latest canonical local document before its IPC. Preserve newer article/mnemonic bytes, remember both its before-source and expected native after-source as own echoes, and publish the draft through the existing autosave pipeline. A committed receipt advances the writer base/revision; it clears document dirt only if that exact source is still current. A newer body remains dirty and its subsequent queued save uses the configuration receipt. Native files and journal remain authoritative.

Face view identity includes the linked target/face for a mnemonic. Cancel outgoing media operations on inline/link changes. Keep the main rich editor mounted but hidden/inert while rendering a linked face through a separate read-only renderer at the actual target path. Missing/invalid sources never display the retained inline mnemonic as a fallback. Static preview links cannot expand a graph or create reviews; opening the source is explicit and first flushes the owner.

Legacy source pickers also separate selection from registration: selection opens a read-only candidate dialog, Cancel writes nothing, and Use source performs guarded backup-first registration. Their public LearningPage callback and old whole-page answer semantics remain unchanged. Partial registration and refresh-only retry are visible, with no attempted rollback or asset cleanup.

## Consequences

No schema, dependency, FSRS/XP or upstream changes. Note front/back remain one canonical Markdown source. Source learning state is independent. Native GUI checkpoint is required before the M15–M18 batch push, with full native/recovery acceptance in M23.
