# M16: Linked mnemonic source selection (in progress)

## Dependencies and baseline

M07 DONE. M15 committed VERIFIED_LOCAL0a1bfc8d with411 pre-commit tests/43files and browser8.3s; native combined checkpoint and M15–M18 push pending. M16 starts from that committed dependency, with only its ledger update uncommitted. CodeScene NOT RUN optional integration unavailable.

Starting baselines:11 native note-study tests pass0.32s;9 native note-command tests pass0.42s;6 frontend tests/2files3.45s (SourcePagePreview.test.tsx did not exist, not claimed as a third file). Existing client12tests pass0.664s.

## Native/API core checkpoint

First JSON-command contracts reproduced3 failures/4cases because source preview/expectedHash were unsupported. A guard-only case initially passed on unknown-command rejection; a valid-preview control was added so it cannot pass merely because the API is absent. A fifth successful-registration preservation case was then added. The first implementation exposed the existing requested-root/canonical-root distinction on macOS temporary paths; canonicalizing the root as ADR0149 already does fixes containment without weakening it.

Five native command tests pass0.26s: both static faces, every original file's bytes and mtime including DB/WAL, Unicode media hashing, changed media fingerprint, missing/recursive back, wrong Library/private/escaping path, stale expectedHash before backup/registration, and explicit UUID insertion preserving opaque properties/BOM/CRLF. Registration changes only the owned UUID, preserves selected content/fingerprint, creates a verified backup and does not create a binding or enable the source.

Frontend API/model first failed4/16 cases, then passed16/16. An additional restored-root source regression failed identity-conflict and was fixed by reading the restored snapshot's own sources. Combined26 tests/4files pass5.35s, including existing note-memory and persistence tests. Browser source previews are explicitly text-only, with no binary-media verification claim. Native clippy all-targets -D warnings passes9.53s.

Codacy local13paths: ESLint9/Semgrep zero findings; Lizard15 advisories, consisting of existing dispatcher/pages/browser orchestrator size/complexity and four Minor explicit-guard complexities in the new native/browser preview helpers. No new Critical/High/security finding, no suppressions. Reused ensure_page body is now named ensure_page_with_hash; its size advisory describes the pre-existing body plus the early source check. CodeScene NOT RUN; no substitute score claimed.

ADR0155 and architecture/abstractions/getting-started updated. Core checkpoint has no UI copy change and no telemetry event: discovery/actions are instrumented with the pending UI. M16 picker/toolbar, late-result/Cancel/apply fault tests, localization and native combined acceptance remain IN PROGRESS; this checkpoint is not task completion. Normal commit evidence follows after the verified hook.
