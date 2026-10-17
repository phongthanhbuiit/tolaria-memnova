# Card editor UI release — 2026-10-18

Scope: U00–U08 in `docs/MEMNOVA-CARD-EDITOR-UI-PLAN.md`, starting at `9ac824b8`. All implementation checkpoints passed the local release gates and normal main push recorded below. Implementation checkpoints are in `docs/MEMNOVA-CARD-EDITOR-UI-IMPLEMENTATION.md`.

## Implementation and regression evidence

Scoped learning-editor typography is consistent at 14px content, 13px controls, 12px labels/help, 16px title, 32px controls and 36px footer actions. Existing shadcn controls, Phosphor icons and semantic theme variables are reused; global primitives are unchanged. Save is the sole primary action; draft-only Apply type/name and contextual field menus have distinct roles. Card type/Status precede Question/Answer; Vocabulary, Properties, Media and read-only review sections retain mounted editor state while collapsed content leaves the accessibility/tab tree.

Source summaries have an explicit Preview source action and restore focus after closing the nested dialog. Media keeps the existing resolver/import pipeline. A regression test reproduced a stale picker busy lock after Library changes; the new visit resets presentation state while old async results stay ignored. Page properties shares the scoped shell and compact editor, preserving the Markdown/hint save contract. No dependencies, schema, Rust, SDK, SQL, FSRS, XP, import or backup changes.

RED evidence precedes behavioral fixes: collapse retained draft state, preset switching reopened Vocabulary, stale picker recovery, rename focus stolen by menu close, helper contrast 4.478:1, and clipped footer at app zoom 125%. Browser checks now pass helper contrast 6.5695:1 light / 7.8406:1 dark and primary text 5.1959:1 / 7.5022:1. Primary colors were already sufficient and remain unchanged. Ref-based focus restoration runs on explicit actions, not ordinary typing.

Focused learning tests: 91 tests / 29 files pass in 14.54s. Normal U06 pre-commit ran all 4,582 frontend tests / 436 files (119.25s), types, and the three new integration scenarios (28.7s). All 10 learning/property/editor integration tests pass without retries (1.5m). Full release coverage and smoke results must be recorded separately below; these focused checks are not a replacement.

Browser QA measures Add/Edit × Basic/Vocabulary in light/dark; 40 final screenshot/layout combinations cover 1280×900, 768×800, 480×800 and 480×640, with Vietnamese and German narrow Vocabulary cases. The baseline has 24 captures. Actual app CSS zoom 125%/150%, focus outside fixed footer/header, coarse pointer 44px targets, no coarse textarea autofocus and reduced-motion behavior were exercised. Theme is asserted before captures. Images were inspected visually, including English light desktop, German dark compact and native light/dark. Browser tests use the Tauri mock and do not establish real persistence.

## Native persistence QA

Current debug backend/frontend built with a temporary QA identifier and incognito webview; `MEMNOVA_CONFIG_HOME=/tmp/memnova-native-config-20261017` and an isolated synthetic Library. The user's Library/preferences and demo fixtures were not used. Real mouse interactions exercised Edit → draft typing → nested source preview/image → invalid number → collapse/reopen → Cancel. All SQLite rows and all non-hidden file bytes/mtimes exactly matched the before snapshot after Cancel.

Explicit Save exercised field Rename priority→importance, lossless Number 0→Text "0" conversion preview/Apply, calendar October 19→22, 2026, native image picker Cancel then successful selection/copy, and the native audio control entering Pause. The copied image SHA256 matches the selected fixture. Only the intended card's `properties_json`, `updated_at`, revision 3→4, and its field definition key/kind changed. All five schedules, six reviews (including an undone review), three sessions, other cards, page IDs/source IDs and Markdown were unchanged. Unicode, false, lists, page references and audio path were retained.

After quitting and restarting the native app, all SQLite tables matched saved state. Lesson/source/media contents and mtimes matched; only the existing CLAUDE.md startup compatibility shim was rewritten with identical bytes and a new mtime. No-op Page properties Save then matched the entire post-restart snapshot, including Markdown mtimes and hint tables. SQLite schema remained 4, integrity_check=ok, foreign_key_check empty. Owned native/Vite processes were closed after QA.

Native screenshots: `native-light.png` (media/actions), `native-dark.png` (content/source/properties), in the evidence directory below. Native narrow-window resizing, OS display scaling, external-browser zoom and a screen-reader session were not exercised; the browser matrix tests viewport size and the app's actual CSS zoom. Existing QA environment console messages about an unavailable WebSocket bridge/updater and a non-Git synthetic Library were not frontend exceptions. A startup asset-scope mismatch preceded the current Library becoming active; selected media and source-relative images subsequently rendered successfully.

## Static analysis, localization and documentation

Codacy Analysis CLI 0.24.0 explicitly scanned all 22 changed TypeScript/code/test files since `9ac824b8`, with project ESLint9, Opengrep and Lizard. ESLint: zero findings. Opengrep: one best-practice warning for `EditorIconButton` forwarding trusted React/Radix props/ref/event handlers to the existing Button; required for asChild composition and focus/keyboard behavior, not an untrusted HTML injection. Lizard: 12 Medium length, three Medium parameter-count and six Minor complexity advisories. Reviewed individually: inherited save/retry dispatch, explicit property type/list/preview composition, compact row JSX, source lifecycle handling, and sequential integration scenarios; no security-sensitive defect or suppression. Destructured React props are counted as parameters. No new Critical/High source findings. CLI exits 1 for these advisories, not analyzer failure. No source/results uploaded. Dependency versions and locks are unchanged; inherited dependency Critical/High advisories from the preceding baseline remain outside this UI scope.

CodeScene: **not run (optional integration unavailable)**, before and after, per AGENTS.md/ADR-0137; no score inferred, no threshold lowered.

Localization: seven interface keys translated manually in all 18 locale catalogs because Lara credentials were unavailable. `pnpm l10n:validate` passes against 902 English keys. Placeholder/product-name validation passes; no English fallback blanket was added. PostHog: no event needed because these are presentation/accessibility refinements to existing actions; existing business events and safe metadata are unchanged.

Refactors extract CardEditorSection, EditorIconButton, CardTypeField, PropertyKindSelect, PropertyRow and explicit focus handling rather than duplicating storage/save paths. `docs/ABSTRACTIONS.md` updated alongside components. ADRs: none needed for styling/composition; existing ADR-0145/0146 contracts unchanged. No Todoist task supplied, so this report is the completion record.

## Release gates

Normal `git push origin main` succeeded, publishing `9ac824b8..2d46c7ae` without bypassing hooks. Pre-push took 7m29s. Final docs-only commit/push records this result; its SHA is available in Git history.

- `pnpm lint`: PASS, zero warnings.
- `pnpm build` (`tsc -b && vite build`): PASS. Existing mixed static/dynamic import and large-bundle warnings remain; no dependency/chunk redesign in this UI scope.
- `pnpm test:coverage` via normal hook: PASS, **4,582 tests / 436 files**, 130.60s. **82.99% statements, 74.65% branches, 84.73% functions, 86.50% lines**; thresholds unchanged.
- `pnpm playwright:smoke` via normal hook: PASS, **54/54 in 4.6m**, below five minutes. No new cosmetic test was tagged smoke.
- Explicit unexcluded `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85`: PASS, **85.82% lines** (30,105 total, 4,268 missed), 85.31% regions. **1,096 unit + one integration pass, three pre-existing ignored**. Hook correctly skipped Rust lint/coverage because no Rust paths changed; the explicit measurement above is separate evidence.
- Learning/property/editor integrations: **10/10**, `--retries=0`, 1.5m; native verification described above.
- Localization validation: PASS, 18 catalogs / 902 keys. Codacy: all 22 changed code/test files scanned and findings reviewed above. CodeScene before/after/project scores: NOT RUN, optional access unavailable.
- Demo hygiene: `git status --short -- demo-vault demo-vault-v2` empty. No user Library used. No uncommitted app code at the successful push. Final remote/local SHA and clean working-tree checks are performed after the docs-only push.

## Evidence

Local evidence root: `/Users/thompson/.codex/visualizations/2026/10/17/01a14956-0bf8-7ca0-81d1-04a1d0fd992a/card-editor-ui/`. It includes baseline/final screenshots, RED/GREEN logs, Codacy SARIF, native database/file snapshots and SHA256 manifest. This is a local QA artifact, not bundled product data or an uploaded service record.
