---
type: ADR
id: "0153"
title: "Portable canvas asset URIs and editor-scoped asynchronous imports"
status: active
date: 2026-10-18
---

## Context

Tldraw4.5.10 requires asset sources to be valid URLs. Plain attachments/name is rejected by its real schema. Native Tauri convertFileSrc encodes the entire filesystem path, including separators. Persisting that device-specific URL prevents portable restores. File import can also finish after the user leaves its editor, and default placeholder-first imports can expose incomplete source to autosave.

## Decision

New local canvas assets use asset://memnova/attachments/<encoded path segments>. Display resolution maps that namespace to the current Library. Native source/media validation recognizes the same namespace and validates actual local bytes through the existing bounded, symlink/private-path rejecting resolver. Neither side guesses a foreign path by basename. Portable URIs reject authority credentials, ports, query/fragment and encoded separators. Existing snapshot URLs are preserved; safe current-Library legacy URLs can render with a repair notice. Online/ephemeral/unavailable sources are reported, with no automatic download, migration, reset or deletion.

Reuse the existing attachment upload/copy pipeline. New file uploads receive a unique filename before calling it; selected vocabulary media resolve against their source note's path and become portable attachment references. Editor resource visits are weakly keyed by editor instance and bound to a Library/note. Async completion requires the same live visit and board lifetime. Read-only boards cannot upload. No mutable board store is shared merely because board IDs match.

Picker, paste and drop use tldraw's existing file asset handler for validation/sanitization/dimensions/upload. Only completed assets enter the document through its atomic createShapesForAssets helper. Pending or failed imports create no document placeholders through this files path. No attachment garbage collection is introduced; interrupted imports may leave an unused file safely retained on disk.

Document snapshots use store.getStoreSnapshot('document'), which works before a session exists and excludes camera/selection/session data. Explicit flush compares the current document with the loaded/saved canonical baseline even before buffered user events arrive. Source echoes preserve that baseline. Native menu Save uses the same existing editor/raw flush wrapper as editor Save; no additional autosave pipeline is created.

## Consequences

Content still lives in one Markdown document; SQLite schema and scheduling do not change. Existing source is not rewritten by opening it. Old builds cannot be assumed to resolve the new URI namespace: downgrade by restoring the pre-upgrade backup into a new directory. Codec/native validation, real tldraw schema tests, native picker/restart/relocation and backup round trips are separate evidence. Render readiness must still account for actual media decode in note study (M19).
