# Memnova implementation ledger

Scope: a Markdown lesson page owns many individually scheduled cards. SQLite owns learning data; Markdown and attachment files retain their existing authority for lesson content. Library is the default product language; existing filesystem/Git capabilities remain available. No bulk upstream merge, cloud sync, AI generation, cloze or image occlusion in V1.

This ledger tracks the plan from the conversation. A checked implementation is not a release claim: release evidence is recorded separately, and unchecked gates remain explicitly unverified.

## Ordered work and dependencies

| Task | Depends on | Acceptance | State |
|---|---|---|---|
| A01 | — | Reproducible baseline, data inventory and quality evidence | Complete — reproducible baseline recorded |
| A02 | A01 | Upstream commit assessment without merging unrelated changes | Complete — selected upstream assessment recorded |
| A03 | A02 | Selective editor lifecycle and stable-ref fixes with regression tests | Complete — implemented, verified and pushed; see release report |
| B01 | A01 | Enabling never resets an existing schedule; deck scope stays scoped | Complete — implemented, verified and pushed; see release report |
| B02 | B01 | One atomic schedule write, save failures propagate, stats follow save | Complete — implemented, verified and pushed; see release report |
| B03 | B02 | Stable session queue, live due clock, deck root, load cancellation, empty answer marker | Complete — implemented, verified and pushed; see release report |
| C01 | A01–B03 | ADR defines learning authority, identifiers, transactions, backup and compatibility | Complete — ADR-0138 recorded |
| C02 | C01 | Persistent library UUID and page UUID survive moves/renames; duplicate detection | Complete — implemented, verified and pushed; see release report |
| C03 | C02 | Rust SQLite ownership, versioned migration, WAL, foreign keys, boundaries | Complete — implemented, verified and pushed; see release report |
| C04 | C03 | Pages/cards/schedules/reviews/sessions/decks with indexes and constraints | Complete — implemented, verified and pushed; see release report |
| C05 | C04 | Typed IPC/client; frontend cannot supply SQL or arbitrary database paths | Complete — implemented, verified and pushed; see release report |
| D01 | C05 | Consistent backup of SQLite, lessons and media; verified restore into fresh directory | Complete — implemented, verified and pushed; see release report |
| D02 | D01 | Read-only migration preview reports counts, invalid schedules and conflicts | Complete — implemented, verified and pushed; see release report |
| D03 | D02 | Backup-first, idempotent/resumable legacy migration preserves schedules/history/media | Complete — implemented, verified and pushed; see release report |
| D04 | D03 | Explicit verified cutover; no duplicate legacy writes; recoverable failure | Complete — implemented, verified and pushed; see release report |
| E01 | D04 | Scheduler adapter; maintained engine update is separate from data import | Complete — implemented, verified and pushed; see release report |
| E02 | E01 | Session state machine, stable IDs, persisted rating transaction, Again waiting/reinsertion | Complete — implemented, verified and pushed; see release report |
| E03 | E02 | Resume and last-review undo with concurrency/idempotency guards | Complete — implemented, verified and pushed; see release report |
| F01 | C05,D04 | Page Content/Flashcards tabs with independent lesson and card editing | Complete — implemented, verified and pushed; see release report |
| F02 | F01 | Card CRUD/drafts/clone/suspend/trash, whole-page answer, retained vocabulary/media | Complete — implemented, verified and pushed; see release report |
| F03 | E03,F02 | Study loading/saving/error/focus/mouse/keyboard behavior and responsive styling | Complete — implemented, verified and pushed; see release report |
| F04 | F03 | Library/pages/decks/stats query the same learning authority, no duplicate totals | Complete — implemented, verified and pushed; see release report |
| G01 | F04 | Local Library onboarding; Git optional under advanced controls | Complete — implemented, verified and pushed; see release report |
| G02 | G01 | Retire legacy writer, retain importer; localization, docs, native QA and release checks | Complete — implemented, verified and pushed; see release report |

## Evidence and release requirements

- Historical baseline: `docs/baselines/2026-10-17-a01.md`.
- Upstream decisions: `docs/baselines/2026-10-17-a02-upstream.md`.
- CodeScene: unavailable, not run; optional under ADR-0137. Thresholds unchanged.
- Every bug starts with a reproducing regression test. Pure layout changes are exempt.
- Every release runs normal verified hooks: lint, actual TypeScript build, frontend coverage ≥70%, Rust tests/coverage ≥85%, and core Playwright smoke. Add focused integration/native QA for new learning behavior.
- Codacy scans distinguish baseline findings from new findings; no new Critical/High finding is accepted.
- All new copy is localized. Existing baseline locale gaps must be resolved before final release.
- Never use user libraries as disposable fixtures. Demo-vault dirt must be empty before completion.
- Commit and push main through normal hooks; no task is called released until push succeeds.

## Final closure

All A01–G02 dependencies and implementation steps are complete. Source was published to `main` at `617f0a8d` through normal hooks: 4,514 frontend tests, 86.40% frontend line coverage, 1,074 Rust unit tests plus one integration test, and 54 core smoke tests in 4.7 minutes. Independent unexcluded Rust line coverage is 85.71%. Native migration, study, lifecycle, media and fresh-directory restore QA used disposable Libraries. Final demo-vault status is empty.

See [the release report](./MEMNOVA-RELEASE-REPORT.md) for exact commands, baseline security advisories, manual localization, optional CodeScene limitations and the evidence archive hash. CodeScene was not run; no remote scores are claimed. Signed packaging, updater publication and other native platforms were not verified.
