# Card editor final-review fixes — 2026-10-18

Starting revision: `2f3490dc`, clean main. Scope: the four findings from the final review of U00–U08. This addendum corrects the earlier release's incomplete coverage of conversion/focus; its historical passing results are not proof that these edge cases were covered. The patch passed the full release gates and normal main push recorded below.

## Fixes

PropertyRow now stores the selected target definition, deriving its preview from the current caller-owned value through the existing lossless converter. Editing 0→42 after opening a Text preview can no longer apply the old "0" snapshot. A rejected target or a newly invalid source has no applicable conversion; recovery recomputes from the corrected source. The selector displays the pending kind, including a rejected selection. Selecting Rename discards pending type conversion. No converter coercions, data schema, persistence, API, scheduling or retry semantics changed.

The type selector receives the existing trigger ref. Opening Change type focuses it after Radix menu close; both Cancel paths clear pending conversion and return focus to the field menu. Coarse-pointer icon buttons now have a 44px minimum width as well as the existing 44px minimum height.

## Regression evidence

Before edits, the five existing PropertyEditor tests pass (2.92s). Three added behavioral tests then fail as expected: stale preview after a source edit, rejection retaining an older valid preview, and a preview not revalidating after input changes. After the fix all eight pass (3.40s); the complete focused learning suite passes **94 tests / 29 files** (31.01s). Additional concurrency with the independent Rust measurement affected this focused run's wall time.

Browser RED: three selected scenarios fail before production edits: coarse icon width, selector focus, and preview value updating. GREEN: all **five card-editor scenarios pass without retries (42.0s)**, including the existing 40 locale/theme/viewport matrix, app zoom 125/150 and pointer/reduced-motion checks. Two new scenarios cover keyboard menu entry, mouse selection, both Cancel focus paths, current-value conversion, rejection/recovery and explicit Save→reload retaining the numeric value. The existing coarse-pointer scenario now measures both dimensions of the field-menu icon target at 480×640. Its no-autofocus assertion remains before any Add/composer interaction. These tests use the browser Tauri mock, not native persistence.

## Native and preservation QA

Used the existing debug QA backend with the current frontend, net.memnova.qa/incognito and isolated MEMNOVA_CONFIG_HOME, with the synthetic Library from the preceding native QA. No user Library or demo fixture used. Real mouse and keyboard interaction verified Change type focuses the selector, Text "0"→Number preview updates to42 after typing, and Date rejection removes Apply. Keyboard Enter committed the highlighted Date option in the native selector. Cancel returned focus to Manage field importance. Whole-card Cancel produced an exact match of every SQLite table and non-hidden file hash/mtime against the baseline.

A second explicit conversion used the same synthetic card and saved the latest value42. A read-only SQLite connection after closing the app confirmed only that card's properties_json, updated_at and revision4→5, and its importance definition Text→Number changed. All other property values, source/owner IDs, other cards, five schedules, six reviews, three sessions, page hints and Markdown/media hashes/mtimes were unchanged. Integrity_check=ok, foreign_key_check empty, schema4 unchanged. Native screenshot native-current-preview.png was visually inspected and shows Current value "42", New value42 and a Number selector. Actual touch hardware, screen-reader QA and a second native restart were not rerun for this patch; browser reload and the real database after process exit were checked. Owned QA app/Vite processes were closed.

## Static analysis and release gates

CodeScene: **not run (optional integration unavailable)** before and after. No MCP tools, configured CLI or authenticated project access were available; thresholds unchanged, no inferred score.

Codacy Analysis CLI0.24.0 scans all three touched TS/TSX code/test files with project ESLint9, Opengrep and Lizard. ESLint and Opengrep have zero findings. Lizard has seven Medium advisories (five function length, one props parameter count, one integration-spec file length) and two Minor complexity advisories. Reviewed: retained PropertyRow JSX/type dispatch and sequential browser scenarios; no security-sensitive defect or suppression. Medium file length reflects the two added user-flow regressions alongside the existing visual matrix. No new Critical/High findings; analyzers complete successfully, CLI exit1 represents advisories. Dependency versions/locks unchanged; inherited dependency advisories remain outside this patch.

`pnpm exec tsc -b` and `pnpm l10n:validate` pass. Localization: no UI copy changes, 18 catalogs/902 keys validated. PostHog: no event needed because this fixes existing field actions and focus/target sizing; existing telemetry unchanged. Refactoring: conversion state now holds only the pending target, avoiding stored stale projections. `docs/ABSTRACTIONS.md` updated. ADRs: none needed; ADR0145/0146 contracts retained. No supplied Todoist task.

Explicit unexcluded `cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85` passes, **85.82% lines**, 85.31% regions, 1,096 unit and one integration pass; three pre-existing ignored. Rust sources unchanged; this is an independent measurement, not a claim that the frontend-only hook ran Rust lint.

Existing learning/property integrations: **7/7 pass without retries (1.2m)**, alongside the five editor scenarios above: 12 integration tests total. Final pre-commit reran all five editor scenarios on the final test version in **39.8s**, including the no-autofocus assertion before any composer interaction.

Normal code commit **9991efc2** passed verified pre-commit lint/types, **4,585 frontend tests / 436 files (138.14s)** and the five editor scenarios. Normal `git push origin main` then succeeded, publishing `2f3490dc..9991efc2` without hook bypass. Pre-push took **8m04s**:

- Full `pnpm lint`: PASS, zero warnings.
- `pnpm build` (`tsc -b && vite build`): PASS. Existing mixed static/dynamic import and large-bundle warnings remain outside this patch.
- `pnpm test:coverage`: PASS, **4,585 tests / 436 files**; **83.00% statements, 74.66% branches, 84.75% functions, 86.51% lines**. Thresholds unchanged.
- `pnpm playwright:smoke`: PASS, **54/54 in 4.7m**, below five minutes. No cosmetic tests added to smoke.
- Rust hook steps correctly skipped because Rust sources did not change; the explicit unexcluded **85.82%** measurement above was run separately for this patch.
- CodeScene before/after/project scores: NOT RUN, optional access unavailable. Final Codacy scan explicitly lists all three changed TS/TSX paths, including staged content, and completed all three analyzers. CSS target sizing was verified by browser geometry assertions; no CSS analyzer result is claimed.
- `git status --short -- demo-vault demo-vault-v2`: empty. Owned native/Vite processes confirmed stopped. Final docs-only commit/push records these results, followed by local/remote SHA and clean-tree verification.

The four review findings are addressed. No new Critical/High source-analysis findings or failing in-scope regression remains in the checks above. Unverified QA dimensions and inherited dependency advisories are stated explicitly rather than treated as passing.

## Evidence

Local evidence: `/Users/thompson/.codex/visualizations/2026/10/17/01a14956-0bf8-7ca0-81d1-04a1d0fd992a/card-editor-review-fixes/`. Includes RED/GREEN logs, native baseline/cancel/saved snapshots, checked preservation summary, screenshot, Codacy SARIF and final hook logs/checksums. Evidence is local, not uploaded to analysis services.
