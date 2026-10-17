# Memnova V1 implementation and release evidence

The A01–G02 plan is implemented. One Markdown lesson owns multiple independent flashcards. A card can reveal its own answer or the current complete lesson. SQLite is the authority for cards, memory, reviews, sessions and learning statistics; lessons and attachments remain ordinary files. Git and AI are optional advanced integrations, disabled unless explicitly enabled.

## Delivered behavior

- Local Library create/open onboarding, Content/Flashcards tabs and a shared Library/deck/study data source.
- Card create/edit/clone, drafts, active/suspended/trash states and restore. Cloning starts fresh memory; editing or restoring an existing card preserves its schedule.
- Basic/Vocabulary editing with IPA, image/audio paths, part of speech, level and existing wikilink pickers for synonyms, antonyms, prefixes and suffixes. Unknown properties and aliases survive editing; switching type does not erase details or memory. Related answers remain hidden until reveal.
- Durable session queues, Again waiting/reinsertion, pause/resume, last-review undo and exact retry receipts. Ratings commit schedule, review and session cursor together. Concurrent lesson registration waits for an existing SQLite writer.
- Backup-first resumable legacy import, read-only conflict preview and explicit verified cutover. Imported schedules/history/media are preserved rather than synthesized or reset. Malformed/ambiguous rows are reported for correction. Legacy writes are blocked after migration begins.
- Verified consistent backups and restoration into a new directory, including lesson/media checksums. No in-place overwrite or copy of a live WAL database is used as a backup.
- Stable lesson identities across renames; editor saves retain the registered identity. Private learning files are excluded from ordinary note scanning, watching and Git operations. Startup housekeeping only targets the explicitly selected Library; it does not fall back to the former home-directory vault.
- Responsive study layout, render-before-rating guards, mouse controls, Space/1–4 shortcuts, loading/retry states and source-change checks. A single clock sample avoids misleading rounded interval labels.

## Scope and architecture

There was no bulk upstream merge. A02 records the selected lifecycle fixes and rejected unrelated changes. The scheduler update is a separate, pinned adapter change (`ts-fsrs@5.4.2`) after migration, not a side effect of importing old memory. No cloud synchronization, AI generation, cloze or image occlusion was added. The old filesystem concept remains for Markdown/media compatibility; Library is the primary product experience.

Architecture decisions: ADR-0137 (optional CodeScene), ADR-0138 (learning authority), ADR-0139 (verified backups), ADR-0140 (resumable cutover), ADR-0141 (scheduler), ADR-0142 (lesson/study UI), ADR-0143 (local defaults and isolated QA). Architecture, abstractions, getting-started guide and task baselines were updated in the implementation commits.

## Verification

The release source commit is `617f0a8d` (following `d903a282`, `7030cfda` and `7627e8bf`). Normal pre-commit hooks passed: 415 frontend test files / 4,514 tests, lint and `tsc -b`.

Independent Rust coverage used the exact command below, with no filename exclusions. It passed with **85.71% lines**, 1,074 passing unit tests, three pre-existing ignored tests and one passing integration test:

```sh
cargo llvm-cov --manifest-path src-tauri/Cargo.toml --locked --no-clean --fail-under-lines 85 --summary-only -- --test-threads=1
```

The normal application pre-push hook passed frontend lint, the TypeScript/Vite build, all **4,514 frontend tests in 415 files**, **86.40% frontend line coverage** (82.75% statements), Clippy with warnings denied and rustfmt. Final Rust-hook/smoke/push results follow:

The full normal `git push origin main` succeeded, publishing `6f030e50..617f0a8d`. All **54 core Playwright smoke tests passed in 4.7 minutes**, below the five-minute lane budget. Hook duration was 9 minutes 1 second. The hook's historical Rust filename exclusions produced 86.86% line coverage; the independent, unexcluded **85.71%** result above is the stricter release evidence. No hook was bypassed.

Evidence archive: `memnova-v1-release-evidence.zip` (Codex task artifacts), SHA-256 `c404bb6ba458309122d8f847e6eab011396419628b8b7fb753048d3f8fcf0372`. It includes the final push log, independent coverage, Codacy SARIF, red/green regressions, localization results, synthetic SQLite checks and native screenshots. `manifest.json` records file hashes. Raw Library databases, application settings and user data are not included.

Additional focused validation passed: 60 vocabulary/editor/study tests, three learning Playwright integration cases (including 480 px responsive bounds), 12 onboarding cases and five existing AI/Git shortcut/pull smoke cases with explicit opt-ins. The earlier full push failed at those missing-opt-in fixtures; the fixtures were corrected without weakening assertions, timeouts or lane tags. A browser-mock regression also removed unnecessary localStorage writes on read-only queries/unchanged source sync.

Bug regressions were written before their fixes. Evidence includes red/green logs for identity retention, backup checksum races, migration locking/root changes, exact review retries, concurrent SQLite writes, private-file watching/Git boundaries, local defaults, interval labels, vocabulary editing and legacy startup fallback. Pure CSS adjustments use visual QA.

## Native QA

Native debug QA used disposable original/restored Libraries under `/tmp/memnova-native-qa-20261017`, with a separate configuration root and app identity. The former `~/Laputa` directory was absent on this machine. No user Library or demo-vault files were used as disposable test data.

Mouse-first testing covered migration preview/import, two cards on one lesson, whole-page reveal, Again, Easy, Undo, pause/reopen, dashboard totals, backup and fresh-directory restore. Additional checks covered clone/edit, suspend/trash/restore, image rendering, actual audio playback and Vocabulary relation selection. Keyboard checks covered Space, 1–4 and existing core shortcuts. A public note created/deleted in the restored Library appeared/disappeared; private WAL changes did not cause a reload loop.

Independent SQLite checks found integrity `ok` and zero foreign-key violations. The legacy example retained 41 repetitions, 3 lapses, stability 19.25, difficulty 4.75 and its future due date. Backup/restore retained card, schedule, review and session rows and identical lesson/media bytes. Clone memory started at zero; restoring a trashed card retained its existing repetitions. Undo retained its review audit row with an undone marker. Vocabulary edits retained memory and did not add reviews.

Screenshots and synthetic SQL evidence are included in the evidence archive. Native QA verifies the macOS debug app; it does not establish signed release packaging, updater publication or Windows/Linux/iOS compatibility. The final startup-selection follow-up was verified with its failing/passing regression and the full Rust suite, without another native launch.

## Security, localization and code health

Codacy Analysis CLI 0.24.0 scanned touched code using ESLint9/Opengrep/Lizard and scanned dependencies with Trivy. No introduced Critical/High finding was identified. The dependency comparison found 140 findings versus 149 in the recorded baseline and zero introduced findings; two Critical proxy-addr 2.0.7 entries and other High dependency findings already existed in baseline. These are not claimed fixed. Existing two props-spread Semgrep warnings and Medium composition/file length/parameter-count findings were reviewed; no rules were suppressed. Follow-up vocabulary scans had zero ESLint/Opengrep findings; startup had zero Opengrep findings and one Medium existing-file-length finding.

All 18 locale catalogs validate against 851 English keys. Lara translation commands were attempted but could not run without credentials; translations were completed directly and `pnpm l10n:validate` passed. Product names/placeholders were preserved. Automated translation quality review remains unverified.

CodeScene before/after file scores and project Hotspot/Average scores were **not run**, because the integration/credentials are unavailable. Under the user-authorized ADR-0137 this is optional and does not replace local gates. Thresholds remain 10.0/9.95; no score is invented and no threshold was lowered.

Meaningful features emit existing opt-in telemetry events: `memnova_card_created`, `memnova_card_updated`, `memnova_card_action`, `memnova_study_started`, `memnova_review_saved`, `memnova_review_undone`, `memnova_migration_started/completed/failed`, `memnova_backup_created/restored`. Metadata contains safe counts/enums only, never lesson/card/relation text. Telemetry remains subject to the existing user preference. Small reliability fixes need no additional event.

No Todoist task was supplied, so no completion comment was posted externally. This repository report is the completion record. Demo fixture status is empty. Remaining limitations are the unavailable CodeScene/translation services, pre-existing dependency advisories and untested release/platform packaging; they are not represented as successful checks.
