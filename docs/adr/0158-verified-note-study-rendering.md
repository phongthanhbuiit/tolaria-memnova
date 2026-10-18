# ADR 0158: Verified note study rendering and snapshot acknowledgements

Status: Accepted

## Context

The backend resolves note study into live article/mnemonic faces, native local-media descriptors and a complete fingerprint. The legacy study UI still renders stored Q/A and property media. Parser or canvas mount success alone cannot establish that the mnemonic images decoded. Legacy local-URL repair can also select a different file than native validation approved.

## Decision

Consume StudyContent.kind explicitly. Note faces use live page/answerPage content and their own media base; old cards retain their Q/A/property behavior. The complete snapshot, Library and session position own reveal/readiness state. The opposite note face is hidden and inert, outside the accessibility tree. Instantiate the back only after explicit reveal; retain mounted faces after that to preserve in-session canvas camera and scroll. Pause hidden-face audio/video. Returning to the article does not rate.

For verified note rendering, map an exact original URI to the native-approved Library-relative path and byte hash. Never decode/guess a foreign basename or fall back through generic legacy media resolution. Add the hash only to the runtime display URL, never to Markdown/snapshots. The existing editor resource visit carries this optional resolver to readonly canvas asset stores. Legacy editors retain the old resolver.

Combine rich-document/canvas status with decoded image or audio/video metadata readiness, including referenced offscreen canvas media. Only mount/preload the selected back after reveal. Ignore unused canvas assets and non-media attachment links; note study navigation links are inert and never expand a session. Dispose visit-owned loaders/listeners. Loading/error revokes acknowledgement; the UI offers reload and blocks both pointer and keyboard grades. Existing native grade revalidation remains authoritative for current source/media bytes. Remote media is not claimed to have a native byte hash.

Replay an already-pending immutable review receipt before applying new source-readiness guards. Keep visit/session guards, replay-aware analytics, schedule adapter and XP math unchanged. Ignore utility-control, canvas/editor, modified or repeated keyboard shortcuts.

## Consequences

No storage/schema/dependency change. New analytics only record reveal/return actions, with no note content or identity. Browser component fixtures exercise actual BlockNote/tldraw/media decoding but do not prove SQLite persistence or native file URLs; native M23 remains required. Default enable/conversion/legacy lane entry is M20, not implied by this renderer change. Source preview reuses exact verified media mapping without enabling or reviewing it.
