# ADR-0164: retain listener identity when disposing tldraw focus managers

Status: accepted. Date: 2026-10-19. Dependency versions, storage and learning algorithms unchanged.

## Context

M24's production-renderer regression repeatedly opens a 1000-shape mnemonic, returns to ordinary notes and switches Libraries. After twenty note cycles and twenty Library transitions, DOM listeners grew from 812 to 13432 and collected renderer heap from 56 MB to 561 MB. The active ordinary-note DOM stayed at 417 elements. A two-visit diagnostic isolated retained body keydown/mousedown listeners.

The installed @tldraw/editor 4.5.10 FocusManager registers bound callbacks but calls bind again during disposal. Those new functions cannot remove the registered callbacks. Each retained callback keeps its editor and detached canvas alive. Window/document listeners and timer/object-URL counts did not explain the growth.

## Decision

Use the repository's existing pnpm patch mechanism for this exact installed version. Bind each handler once in the constructor, then use that same function for registration and disposal. Patch source, ESM and CommonJS distributions consistently. Preserve every existing dependency patch and version; validate installation with the frozen lockfile. Do not remove global listeners from application code or change editor focus semantics.

The real UI regression checks twenty note and twenty Library transitions, including DOM listeners, timers, URLs and unintended writes. It must pass after the patch; do not relax its listener assertion. Rerun affected editor, layout and native last-stroke/focus checks after rebuilding. Resource counters are Chromium evidence, not a native/WebKit heap claim.

## Maintenance

The patch is version-specific and must fail installation if it no longer applies. On a future SDK upgrade, inspect the upstream implementation and rerun the lifecycle regression before removing it. This task does not upgrade the SDK or merge upstream. Bundled SDK license requirements remain unchanged. No new UI copy or analytics event is needed for this lifecycle correctness fix.

When applying or changing a pnpm patch, stop an already-running Vite server and restart with `pnpm dev --force` before dev QA. M24 verified that a long-lived server retained the old prebundle despite a successful fresh production build; the served prebundle must contain the patched handlers. This is development-cache invalidation, not a reason to weaken the lifecycle regression.
