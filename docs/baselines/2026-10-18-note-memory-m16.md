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

## UI and shared-queue checkpoint

Core verified commit81bce958 passed4769 frontend tests/459files and1199 Rust unit tests/3ignored48.42s. Normal batch push remains pending M18.

Configuration shares the content writer queue and stages only system config in the current draft. Actual RED10/31 cases covered the missing config queue/staging API and an existing linked-back projection exposing retained local data. GREEN31 tests/2files pass0.786s. The hook integration then reproduced its missing configureBack API and now passes together with the domain/face tests37/4files1.67s: a newer article stroke survives an in-flight config and saves against the committed hash/revision. Exact uncertain config retry, caller mutation, no-op and all noncommitted receipt kinds are covered.

Readonly selection/service contracts7tests pass0.973s. The existing legacy picker regression really reproduced registration on mere selection; it now passes without flushing, UUID assignment or parent field changes on Cancel. Its old-Library late completion guard still passes after explicit Use source. Existing legacy whole-page preview/draft/reps/property assertions remain; only the UI test steps were updated for explicit confirmation and expectedHash.

New source-dialog3tests and toolbar/linked-reader3tests pass, covering explicit face, owner/other-Library filtering, partial registration and owner-only retry, stale content removal, failed-save navigation blocking, and returning inline without source mutations. Latest targeted run45tests/8files passes7.08s; types pass. Earlier broader63-test run found the old source test still expected automatic registration; its original preservation assertions now pass with explicit confirmation.

Real browser UI plus real copied fixture files: source selection/Cancel preserves both Markdown sources, explicit source Apply adds only its UUID, source remains ordinary, linked back displays the target's selected face, and return-inline restores the complete original owner bytes while keeping the source UUID. QA text model counters remain0cards/0reviews/0sessions/0bindings. Source flow5.5s plus M15 editor6.6s,2tests15.6s total, zero retries. Screenshots/tmp/memnova-m16-linked-source.png and/tmp/memnova-m16-restored-inline.png were viewed at1280x720/light/English. Browser counters are not presented as native database proof; real-file/SQLite source preservation is covered by the native core tests above. Native integrated M15–M18 QA and full M23 still pending.

Nine English copy keys and17 direct target translations; Lara attempted but credentials unavailable. Validation18catalogs/957Englishkeys passes. PostHog memnova_note_back_source_changed records only kind/face after committed configuration; legacy picker Cancel fix needs no extra event because it removes accidental work, while existing preview telemetry remains. No PII, source content, IDs or paths are emitted.

Final local UI Codacy22code paths: ESLint9 zero, Semgrep1 existing typed props-spread advisory in Editor, Lizard31 size/complexity advisories. New Medium spans are declarative view markup, sequential partial-apply/refresh lifecycle and behavioral tests; snapshot validation and durable mutations are factored into tested services/queue. Reviewed as structural advisories, no security/correctness finding; no new Critical/High and no disabled rules. CodeScene NOT RUN, optional integration unavailable, and no substitute score claimed. New UI/modules were formatted with a pinned transient Prettier3.6.2 CLI without changing package/lock/dependencies; large unrelated modules were not reformatted.

ADR0156 added without editing the committed ADRs. Architecture/abstractions/getting-started updated. Demo-vault dirt empty; browser servers stopped by Playwright. Final verified UI commit follows. This is not whole-plan completion.
