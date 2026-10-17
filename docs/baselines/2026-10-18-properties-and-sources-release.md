# Memnova properties and answer sources — release verification

Scope: N00–N17 in `MEMNOVA-PROPERTIES-AND-SOURCES-PLAN.md`, starting at `89fd0465`. The implementation preserves ordinary Markdown pages, multiple independent flashcards per owner page, and explicit optional source-page UUIDs. Page values remain in Markdown, card values in SQLite, and type hints are separate. No FSRS/XP algorithm change, dependency addition, inheritance, bulk upstream merge, or user-Library migration outside the authorized additive schema changes.

## Implementation

- N02/N03 preserve vocabulary arrays/aliases and enforce Trash → unchanged Draft restore.
- N04/N05 persistent backup discovery, verification and fresh-directory restore; malformed entries are isolated, including unrenderable timestamps.
- N06–N09 schema v3 source references, separate owner/source DTOs, live UUID resolution, answer fingerprints and exact rating replay; source picker/preview does not create a study session.
- N10–N15 pure property operations, schema v4 type-hint tables, transactional card writes/retries, shared typed controls and safe Markdown property adapter. Unknown/nested/unsafe values stay read-only unless explicitly removed; no automatic lossy conversion. Card preset fields are not duplicated in the generic editor. Page no-op Save does not write/register anything.
- N16 media import/owner-relative rendering, read-only memory, error handling, keyboard isolation, light/dark and narrow layouts. Native audit additionally found and fixed unchanged-question renderer readiness after source reload.

## Verification commands

- Normal `git push origin main` invokes lint, TypeScript/Vite build, full frontend coverage, rustfmt/Clippy, configured Rust coverage and curated smoke. First attempt correctly blocked on Clippy `collapsible_match` in the new legacy-number preservation helper; a behavior-preserving guard refactor fixed it. Six native property API regressions pass before and after; `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` passes, Codacy zero findings for the refactor. Final push results: PASS at `c9bd8d259fa3da35a1ac173c0f31e8fcc91c4777`: 4,576 frontend tests/435 files, **86.50% frontend lines**, 1,096 Rust unit tests + one integration (3 pre-existing ignored), configured Rust lines 86.96%, **54 smoke tests in 4.6m**. Lint/build/Clippy/rustfmt passed. Full hook took 8m27s; normal push succeeded.
- Exact unexcluded `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85`: PASS, **85.82% lines** (30,105 lines; 4,268 missed), 85.31% regions. This is distinct from the hook's filtered report. 1,096 Rust unit tests and one integration passed; 3 pre-existing tests ignored.
- `pnpm exec playwright test -c playwright.integration.config.ts tests/integration/memnova-learning.spec.ts tests/integration/memnova-properties.spec.ts --retries=0`: PASS, 7/7 in 1.2m, no retries.
- `pnpm l10n:validate`: PASS, 18 catalogs against 895 English keys.

Focused TDD logs record RED before fixes and GREEN afterward. New integration cases remain outside the curated smoke lane. Local feedback commands (`pnpm test:learning`, `pnpm test:related <file>`, `cargo test ... learning::`) do not replace release gates.

## Native data and UI evidence

All native work used `/tmp/Memnova QA.app`, a QA Tauri identifier/incognito webview and `MEMNOVA_CONFIG_HOME=/tmp/memnova-native-config-20261017`. No real user Library/preferences or `~/Laputa` were used.

- Native v2→v3→v4 upgrade created verified backups before changes. Reopen/restart retained source/card IDs, properties and memory. Upgrade interruption/rollback and corrupt backup cases are also covered by native Rust temp-Library tests.
- A card owned by lesson B uses page A as its answer. All seven property kinds were entered with native controls (text, number=0, boolean=false, calendar date, text list with a comma/Unicode, page UUID, page UUID list), saved and reopened. Page metadata stayed in Markdown and did not change card metadata. No-op Save preserved exact mtime and SHA256.
- Native PNG/WAV file pickers copied files through existing attachment commands; checksums match. Image rendered, Play changed to Pause. Source rename/move retained UUID and rendered a relative image from its new directory. Missing source blocked Reveal/rating; returning the same UUID recovered.
- Source edited after Reveal rejected grading before a review was inserted. Reload→Reveal displayed the latest content; Good→Undo restored all five cards' state/due/reps/lapses. Review history retained its earlier five rows and appended one marked-undone review. Schedule revision increased monotonically.
- Modern backup restore: original and fresh-directory restored tables match exactly for 5 cards, 5 schedules, 6 review rows, 3 sessions, 3 page type hints, 7 card type hints, and empty deck tables. Markdown/media bytes match; `integrity_check=ok`, `foreign_key_check=[]`.
- Schema-v2 backup restore: fresh copy upgrades to v4; all original columns/IDs match for 4 cards, 4 schedules, 5 review rows and 2 sessions. New hint tables remain empty; integrity/FK pass. Original Library is untouched by restore.
- Browser 480×800 light card form and dark page properties verified visually; fixed Save/Cancel footer stays reachable. Native dark page properties and light media screenshots inspected. Final screenshot capture asserts actual resolved dark theme and disables animations.

## Security, localization and architecture

Final Codacy CLI scan (plus the zero-finding scan of the final guard-only refactor) covers all 82 existing code/test/workflow paths changed since the starting revision, not just the last diff: ESLint9/Opengrep/Lizard. No new Critical/High findings. ESLint has zero results; the sole Opengrep warning is the unchanged `InspectorBody {...bodyProps}` best-practice advisory, present in the starting revision. Lizard has 23 medium length/parameter and 36 minor complexity advisories. Reviewed: UI composition/type dispatch, explicit async save/retry state, test fixtures and inherited dispatcher/session/mock structure; no security defect or rule suppression. Its very long JSX “interval” measurement is a parser attribution, not an actual 307-line interval algorithm. Dependency versions/locks were not changed; inherited dependency Critical/High advisories remain outside this scope, as recorded in the prior baseline.

CodeScene: **not run (optional integration unavailable)**, before and after; no scores inferred and thresholds unchanged (ADR-0137). Local gates are actual measured evidence, not a substitute CodeScene score.

All 18 locale catalogs validated at 895 keys. Lara credentials were unavailable; affected labels were translated manually into every target and placeholders validated. User copy remains in locale files.

Safe PostHog events: `memnova_card_created`, `memnova_card_updated` (property/type counts), `memnova_source_preview_opened` (no content), `memnova_page_properties_saved` (counts), `memnova_card_media_selected` (kind enum). No field names/values/note content/paths. No event needed for migration/bug-only safety fixes or draft-only primitives because owning user actions already emit events.

ADRs 0145 and 0146 document the source/property contracts and retry semantics. Architecture, abstractions and getting-started documentation were updated alongside implementation. Refactors centralize manifest validation, pure property conversion/diffing and media resolution; no CodeScene-driven score claim.

## Delivery

Application commit `c9bd8d259fa3da35a1ac173c0f31e8fcc91c4777` was pushed to `origin/main` through normal hooks; remote SHA matched and working tree/demo fixture status were empty. The documentation commit containing this report completes the evidence/ledger handoff. Its final remote alignment and clean status are retained in the external `git-verification.json` after the documentation push.

Evidence archive: /Users/thompson/.codex/visualizations/2026/10/17/01a14956-0bf8-7ca0-81d1-04a1d0fd992a/memnova-n17-release-evidence. Native JSON comparisons and selected RED/GREEN/release logs are retained there with a SHA256 manifest; screenshots are in its parent directory. Native QA and development servers created for this run are stopped. Demo fixture dirt is empty. No full upstream merge or user data cleanup command was run.
