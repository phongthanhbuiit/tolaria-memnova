# Review recovery and focused test feedback — 2026-10-17

Starting point: clean `main` at `c49de8c0` / `origin/main`. The independent review reproduced three async recovery defects before this change. Additional regression tests reproduced stale Library refresh errors, grading during pause, A → B → A ownership, lost Undo response reconciliation, and visible legacy separators. No schema, scheduler, Rust source, dependency version or upstream merge was changed.

## Implemented

- Preserve returned card revisions across a successful write followed by failed list refresh. Unchanged Retry refreshes only; further edits update the persisted card.
- Retry committed statistics refresh after rating/Undo errors, including an uncertain Undo response. Preserve exact rating replay requests.
- Isolate all study operations by Library visit, including returning to the same Library; lock pause/skip against concurrent grading. Ignore delayed background errors from previous Library generations.
- Reuse existing shadcn components and theme tokens. Add an accessible Status label, Edit-card title, clear saved/refresh error, scrolling form body and fixed actions; wrap long card text. Keep inline draft text when toggling whole-page answers.
- Hide only the legacy separator in note-list previews; preserve the original Markdown and imported data.
- Add focused test commands and staged-path pre-commit selection, with conservative shared/IPC fallbacks. Full pre-push gates remain mandatory. ADR-0144 and architecture/abstraction/getting-started docs updated.

## Evidence

- Red: `/tmp/memnova-reliability-red.log` (5 failing regressions), `/tmp/memnova-undo-reconcile-red.log` (1 failing), `/tmp/memnova-preview-red.log` (1 failing).
- Green: learning module 35 tests / 12 files in 6.12s; related test file 4 tests in 696ms; note-item 22 tests in 3.35s; workflow planner 8 tests in approximately 65ms. These are measured runs on this machine, not speed guarantees.
- Browser: 4 integration cases passed in 34.9s, including 480×800 long-form Save/Cancel visibility, no horizontal overflow, retained inline answer and accessible status.
- Native macOS: rebuilt debug binary with isolated QA identifier/config and disposable restored Library. Mouse edit/save/reopen persisted vocabulary level C1; light and dark form screenshots inspected. Mouse reveal displayed current whole-page lesson, keyboard 3 committed a rating, mouse Undo restored the previous state and Close dismissed/paused the session. Escape closed the form. Updated note preview omitted the separator. SQLite integrity_check returned ok; one session was paused and one completed. Browser mocks are not the native persistence evidence.
- Rust: exact unexcluded `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --locked --no-clean --fail-under-lines 85 --summary-only -- --test-threads=1` passed, 85.71% lines. No Rust source changed.

## Analysis and limitations

CodeScene before/after: **not run**, integration unavailable under ADR-0137; thresholds unchanged and no scores inferred. Codacy ESLint9 reported zero issues; Opengrep found zero security issues across 12 changed production/test/workflow files. Lizard reported 11 complexity/size advisories: the medium findings are the pre-existing NoteItem composition/props and its long test scenario; changes add only a preview-local string transformation and a separate regression. Minor findings concern explicit hook/planner/list control flow. These are not security defects, and no rule was suppressed. No new Critical/High finding in this changed-code scan. Dependency versions are unchanged; the previous full dependency scan still has inherited advisories, including Critical/High findings, and this patch does not claim to resolve them.

Localization: Lara command attempted but credentials unavailable. Four keys translated directly into all 18 catalogs; validation passed against 855 English keys. PostHog: existing card/study events retained; refresh-only retries do not emit duplicate card events. No new event needed for recovery/layout/test-workflow changes. No note content was added to telemetry.

Original front/back syntax remains an import compatibility mechanism, not a required authoring model. Use focused inline cards for individual ideas and optional whole-page cards for recalling a lesson. Whole-page answers follow the current lesson; inline answers remain independent after import. No user data was migrated or deleted by this patch. Only isolated QA fixture data was exercised. Demo-vault dirt checked empty.

This is targeted recovery and UI QA, not proof of absence of every application defect. Release packaging/updater, other operating systems, full localization linguistic review and CodeScene are not verified here.

## Final verified release checks

Source commit: `05735ed8`, pushed to `origin/main` with normal hooks. Pre-commit: lint, incremental TypeScript, 4,523 frontend tests in 417 files (118.72s), eight workflow tests, four integration cases (36.1s), 18-locale validation passed. Pre-push: lint, production build (14.47s), all 4,523 tests with 86.47% frontend line coverage, workflow regression tests, and 54 smoke cases (4.6 minutes) passed. Total pre-push: 7m 31s. The hook correctly skipped Rust because no Rust source changed; the independent exact Rust coverage run above passed 1,074 unit tests and one integration test, with three existing ignored tests. CodeScene was explicitly unavailable, not passing.

The native QA app and agent-owned Vite server were stopped. Repository demo fixtures remain clean. Screenshots and raw logs are archived outside the repository at `/Users/thompson/.codex/visualizations/2026/10/17/01a14956-0bf8-7ca0-81d1-04a1d0fd992a/memnova-recovery-evidence.zip`. No live Library database is included in that archive.
