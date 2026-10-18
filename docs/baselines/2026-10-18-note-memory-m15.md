# M15: Canonical two-face editor

## Starting state

Dependency M06 is DONE; M12–M14 normal push77d107c35e095f1aa15641503422057655ee34f1 passed9m8s, matching remote/local with clean tree. Frontend4730 tests/87.11%lines; native1194+1integration/3ignored, hook87.62%lines with its existing exclusions;54core smoke4.6m. CodeScene NOT RUN: optional integration unavailable.

Focused starting baseline100tests/4files passed6.51s: existing document codec, save hook, raw-mode hook and editor. An explicitly requested editorRawModeSync.test.ts path did not exist; the four actual files and100 tests are the evidence, not five files.

## TDD and behavior

New domain contracts:12 canonical-document tests and10 persistence-coordinator tests first failed because their new modules did not exist, then passed. These are new feature contracts, not claimed pre-existing bug reproductions. Real existing-hook regressions then failed3/4 cases: configured disabled note tabs, synchronous face merging and old-note callback rejection. Routing regressions failed2 cases: projected rich content replaced the complete raw source, and owned saves still called the generic file command. Both passed after integration. A connecting-Library regression also reproduced a face reset and now passes without changing the note visit.

Actual Playwright uncovered a further same-path face swap failure: pending parent echo kept article DOM visible under the mnemonic tab. A focused tab-swap regression reproduced the same failure after fixing two test harness errors (incorrect mock helper name, then missing deterministic frame spy). Only the final content assertion failure is counted as its RED. Explicit projection identity/guard fixes it. The full31 tab-swap tests pass139ms. Another real RED proved resource visits survived a face change; the resource hook now rotates visits so late imports cannot target the new face.

Latest combined targeted run143tests/11files passed11.78s, including existing save-failure/pending and editor regressions. Types pass. React act warnings from existing asynchronous editor mocks remain logged without disabled rules or failed assertions. Final pre-commit/analysis results follow below.

## Browser/visual evidence

Real tldraw-independent rich editor plus browser learning model and real copied fixture filesystem: type article, immediately select mnemonic, type mnemonic, return to article, CmdS, and enter raw mode. Persisted file retains both last edits, one delimiter and byte-identical original metadata including a large integer. Passed8.4s/11.4s whole command with zero retries while other read-only checks ran. Earlier isolated pass5.3s/7.4s. Article/raw screenshots under/tmp/memnova-m15-editor-*.png were viewed; article uses existing system buttons/icons and normal note width. No cosmetic or mock-heavy test added to curated54 core smoke.

Native M15 acceptance is NOT YET RUN; the M15–M18 checkpoint and M23 must cover the integrated native UI. M14 native canvas evidence does not substitute for the new persistence/editor path. Default conversion/learning entry remains staged until M20.

## Preservation, localization and release boundaries

One canonical source and existing autosave pipeline. Untouched header/opposite face retained; no auto-created canvas, no ordinary-note activation, no schema/algorithm/dependency changes. Pending/conflicting/discarded outcomes do not mark drafts clean. Local conflict copy uses the existing clipboard helper. ADR0154 and architecture/abstractions/getting-started updated. PostHog events memnova_note_face_changed(face) and memnova_note_mnemonic_added(empty metadata) contain no note IDs, paths or content.

Three new interface keys live in en.json and all17 target catalogs. Lara attempted but missing credentials; direct translations used. Validation18catalogs/948Englishkeys passes. CodeScene NOT RUN; optional integration unavailable. Codacy first scan caught three ref-parameter naming/immutability errors in the new projection hook; fixed without suppression, final results recorded below. Final normal commit/push/coverage remain required; VERIFIED_LOCAL is not DONE.

Final Codacy scan21 touched/new code files: ESLint9 zero findings after ref names were corrected, Semgrep1 existing typed editor props spread, Lizard23 advisories in existing editor/layout/raw/legacy swap orchestration plus a Minor12-branch new hook. New document/persistence/projection/tab modules have no Medium+ finding. Medium size/parameter-count advisories are reviewed existing orchestration/test structure, not new security defects. No new Critical/High/security findings, no suppression. Final37 focused tests/3files pass1.92s after the lint-only ref-name correction; no production semantics changed since the143-test/browser run.
