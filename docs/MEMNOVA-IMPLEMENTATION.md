# Memnova implementation ledger

Scope: a Markdown lesson page owns many individually scheduled cards. SQLite owns learning data; Markdown and attachment files retain their existing authority for lesson content. Library is the default product language; existing filesystem/Git capabilities remain available. No bulk upstream merge, cloud sync, AI generation, cloze or image occlusion in V1.

This ledger tracks the plan from the conversation. A checked implementation is not a release claim: release evidence is recorded separately, and unchecked gates remain explicitly unverified.

## Ordered work and dependencies

| Task | Depends on | Acceptance | State |
|---|---|---|---|
| A01 | — | Reproducible baseline, data inventory and quality evidence | Baseline recorded |
| A02 | A01 | Upstream commit assessment without merging unrelated changes | Assessment recorded |
| A03 | A02 | Selective editor lifecycle and stable-ref fixes with regression tests | Implemented and pushed through verified hooks |
| B01 | A01 | Enabling never resets an existing schedule; deck scope stays scoped | Implemented and pushed through verified hooks |
| B02 | B01 | One atomic schedule write, save failures propagate, stats follow save | Implemented and pushed through verified hooks |
| B03 | B02 | Stable session queue, live due clock, deck root, load cancellation, empty answer marker | Implemented and pushed through verified hooks |
| C01 | A01–B03 | ADR defines learning authority, identifiers, transactions, backup and compatibility | Recorded in ADR-0138 |
| C02 | C01 | Persistent library UUID and page UUID survive moves/renames; duplicate detection | Backend verified/pushed; Markdown ID assignment pending D03 |
| C03 | C02 | Rust SQLite ownership, versioned migration, WAL, foreign keys, boundaries | Base backend verified/pushed; remaining endpoints/profile integration pending |
| C04 | C03 | Pages/cards/schedules/reviews/sessions/decks with indexes and constraints | Base backend verified/pushed; remaining endpoints/profile integration pending |
| C05 | C04 | Typed IPC/client; frontend cannot supply SQL or arbitrary database paths | Base backend verified/pushed; remaining endpoints/profile integration pending |
| D01 | C05 | Consistent backup of SQLite, lessons and media; verified restore into fresh directory | Backend verified/pushed; migration/UI wiring pending |
| D02 | D01 | Read-only migration preview reports counts, invalid schedules and conflicts | Pending |
| D03 | D02 | Backup-first, idempotent/resumable legacy migration preserves schedules/history/media | Pending |
| D04 | D03 | Explicit verified cutover; no duplicate legacy writes; recoverable failure | Pending |
| E01 | D04 | Scheduler adapter; maintained engine update is separate from data import | Pending |
| E02 | E01 | Session state machine, stable IDs, persisted rating transaction, Again waiting/reinsertion | Pending |
| E03 | E02 | Resume and last-review undo with concurrency/idempotency guards | Pending |
| F01 | C05,D04 | Page Content/Flashcards tabs with independent lesson and card editing | Pending |
| F02 | F01 | Card CRUD/drafts/clone/suspend/trash, whole-page answer, retained vocabulary/media | Pending |
| F03 | E03,F02 | Study loading/saving/error/focus/mouse/keyboard behavior and responsive styling | Pending |
| F04 | F03 | Library/pages/decks/stats query the same learning authority, no duplicate totals | Pending |
| G01 | F04 | Local Library onboarding; Git optional under advanced controls | Pending |
| G02 | G01 | Retire legacy writer, retain importer; localization, docs, native QA and release checks | Pending |

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
