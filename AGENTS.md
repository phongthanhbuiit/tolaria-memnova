# AGENTS.md — Memnova (Tolaria fork)

## 1. Development Process

### Start working on a task

Before editing, inspect `git status`, read the relevant architecture/ADR documents, and review the latest baseline under `docs/baselines/`. Run focused tests for the behavior being changed, then the mandatory local release checks before pushing. Preserve existing user changes and distinguish pre-existing failures from regressions.

CodeScene is optional for this fork (ADR-0137). Use it when authenticated access is already configured. Missing CodeScene tools, licensing, or tokens must not block implementation or cause repeated credential/approval requests. Record it as **not run**, never as passing. Local lint, types, tests, coverage, security analysis, data-preservation checks, and verified Git hooks remain mandatory.

- Read task description and all comments fully
- For To Rework: the ❌ QA failed comment tells you exactly what to fix
- Check `docs/adr/` for relevant architecture decisions before structural choices
- Check `docs/ARCHITECTURE.md` and `docs/ABSTRACTIONS.md` for relevant structural information
- For UI tasks: study app visual language and components first. Prioritize reusing existing components, assets, and variables over recreating them.
- If working on a Todoist task, add a comment: `🚀 Starting work on this task. [Brief description of approach]`

### Commits & pushes

- Push directly to `main` — no PRs, no branches. Pre-push blocks non-`main` pushes.
- Commit every 20–30 min: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- Pre-push hook runs full check suite (build + tests + core Playwright smoke + CodeScene when configured)
- **A task is NOT done until `git push origin main` succeeds.** If the hook blocks: read the error, fix it (clippy, tests, CodeScene, build), commit the fix, push again. **⛔ NEVER use --no-verify for AI agents.**

### TDD (mandatory)

Red → Green → Refactor → Commit. One cycle per commit. For bugs: write failing regression test first, then fix. Exception: pure CSS/layout changes.

**Test quality (Kent Beck's Desiderata):** Isolated · Deterministic · Fast · Behavioral · Structure-insensitive · Specific · Predictive. Fix flaky tests first. Prefer E2E over unit tests for user flows.

### Localization (mandatory for UI copy)

All user-facing UI labels/copy must live in `src/lib/locales/en.json` and be translated into every target listed in `lara.yaml`. When adding or changing interface copy:

```bash
pnpm l10n:translate
```

If Lara credentials are available, run the translation command above. If they are unavailable, translate the affected keys into all `lara.yaml` targets directly and run `pnpm l10n:validate`; do not block coding on a translation-service account or insert English fallback values into every locale. Record which method was used.

Use `pnpm l10n:translate:force` only when intentionally regenerating existing translations. Commit `src/lib/locales/*.json`, `lara.yaml`/`lara.lock` changes if produced, and verify placeholders/product names stayed intact.

### Product analytics (mandatory for meaningful features)

New features should almost always emit a PostHog event so we can see whether users actually discover and use them. Skip instrumentation only for very small changes where a dedicated event would create noise. Use clear, stable event names, avoid PII or note content, and include only safe metadata that helps evaluate adoption and failures.

When adding or changing a meaningful user-facing feature, include the event name(s) in the Todoist completion comment alongside QA, docs, and code health. If intentionally not instrumenting a feature, explain why in the completion comment.

### Code health

- Keep responsibilities small, extract testable domain logic, and avoid duplicating editor/storage pipelines. Never add `as any`, `// eslint-disable`, or `#[allow(...)]` to bypass checks.
- When CodeScene is configured, prefer its MCP; otherwise use `cs` and the project API. Capture before/after evidence for touched files and avoid regressions. New scorable files should target 10.0; files already at 10.0 must remain there.
- `.codescene-thresholds` remains a ratchet for configured CodeScene analysis: never lower it or fabricate scores. A missing external score is not equivalent to a failed local quality check.
- When CodeScene is unavailable, record that limitation and continue with the local gates below. Do not substitute Lizard complexity for a CodeScene score.

### Security scan with Codacy (mandatory)

Use Codacy as a security and static-analysis gate before a task is considered releasable.

- Prefer the Codacy MCP inside Codex to inspect repository/file issues for every touched code file.
- If MCP is unavailable, use the local Codacy Analysis CLI, currently verified as `pnpm dlx @codacy/analysis-cli@0.24.0`. Create its auto configuration and SARIF output outside tracked source. Local analysis does not require Codacy Cloud credentials; do not assume `.codacy/cli.sh` exists.
- Select relevant analyzers (ESLint9, Semgrep/Opengrep, Trivy, Lizard), preserve project exclusions, report analyzer errors, and separate baseline findings from newly introduced issues. Do not upload source/results or connect an account unless requested.
- **Always fix Critical and High severity findings introduced by your change.** Do not move the task to In Review with new Critical/High Codacy issues.
- Review Medium findings. Fix them when they are real defects or security-sensitive; otherwise explain why they are acceptable in the completion comment.
- Never silence a Codacy rule just to pass the scan. Prefer small code changes that remove the finding.

### Check suite (runs on every push)
```bash
pnpm lint && pnpm exec tsc -b && pnpm test && pnpm test:coverage  # frontend ≥70%
cargo test && cargo llvm-cov --manifest-path src-tauri/Cargo.toml --no-clean --fail-under-lines 85
```

Coverage is a release gate, not a vanity metric:
- Frontend coverage must stay ≥70%.
- Rust line coverage must stay ≥85%.
- For bug fixes, add a regression test when practical.
- For new behavior, add targeted coverage close to the changed code; do not rely only on broad E2E coverage.

### UI and native QA

**Phase 1 — Playwright (only for core user flows):**

Write Playwright test in `tests/smoke/<slug>.spec.ts` only if feature touches: vault open, note create/save/delete, search, wikilink navigation, git commit/push, conflict resolution. Tag a test with `@smoke` only if it protects a core pre-push workflow. Do NOT tag cosmetic or mock-heavy checks — keep those in the full regression lane. The curated `pnpm playwright:smoke` suite must stay under **5 minutes**; use `pnpm playwright:regression` for the full Playwright pass.

```bash
pnpm dev --port 5201 &
sleep 3
BASE_URL="http://localhost:5201" npx playwright test tests/smoke/<slug>.spec.ts
```

**Phase 2 — Native app QA:**

Use a disposable Library and isolated preferences. Debug builds accept an absolute `MEMNOVA_CONFIG_HOME` directory; release builds ignore this override. Settings and Library lists both use it. Launch a QA-specific Tauri identifier and an incognito webview using a temporary config override outside source (see ADR-0143 and `docs/GETTING-STARTED.md`). Never change HOME or overwrite the real user configuration to run QA.

```bash
pnpm tauri dev &
sleep 10
bash ~/.openclaw/skills/tolaria-qa/scripts/focus-app.sh tolaria-memnova
bash ~/.openclaw/skills/tolaria-qa/scripts/screenshot.sh /tmp/qa-native.png
```

Use computer-use/browser-control style interaction for native UI QA when available: click, hover, drag, select, scroll, and type the way a real user would with the mouse and trackpad. For every UI feature, test the primary mouse-driven path first, then verify any relevant keyboard shortcut or keyboard-first workflow still works. Tolaria is still a keyboard-first app, but QA must not assume users only interact by keyboard.

Use `osascript` for app focus, keyboard shortcuts, and keyboard-specific checks. **⚠️ WKWebView:** `osascript keystroke` can be blocked inside editor content — use computer use for native editor interaction when possible, and rely on Playwright for deterministic text-input coverage. Record the result and screenshot path in the task report; use Todoist only when it is part of the supplied task. The optional `~/.openclaw` scripts may not be installed: use available native computer-use tools instead. The current Tauri product is `tolaria-memnova`, identifier `net.memnova.app`. Do not assume a running app named Laputa or Tolaria is this fork.

### Release-readiness checklist

Before pushing or declaring completion, verify the release gates and record the results in the task report or final response. Add a Todoist comment only when the user supplied a Todoist task and authorized that workflow. The record must include:

- What was implemented (a few lines covering logic and UX/UI).
- QA: what was tested and how (Playwright / native screenshot / osascript).
- Tests/coverage: commands run and final coverage result.
- CodeScene: before/after and project scores when configured; otherwise explicitly say "CodeScene: not run (optional integration unavailable)". Never claim unmeasured thresholds passed.
- Coverage commands passed (`pnpm test:coverage` and `cargo llvm-cov ... --fail-under-lines 85`) or the change is docs-only.
- Codacy: MCP/CLI scan summary; confirm no new Critical/High findings.
- Localization: user-facing copy lives in `src/lib/locales/en.json`, all targets are translated, the translation method is recorded, and `pnpm l10n:validate` passes. If no copy changed, say “Localization: no UI copy changes”.
- PostHog: meaningful new user actions/events are instrumented with safe metadata; noisy/minor changes explicitly say “PostHog: no event needed because …”.
- Refactoring: any files refactored to meet the CodeScene gate, or "none needed".
- ADRs: any new/updated ADRs, or "none".
- Docs: any updated docs (`ARCHITECTURE.md`, `ABSTRACTIONS.md`, etc.), or "none".
- Demo vault dirt checked: `git status --short -- demo-vault demo-vault-v2` is empty unless fixture changes are intentional.

### ADRs & docs

ADRs live in `docs/adr/`. Create in the same commit as the code. Never edit existing — create a new one that supersedes. Use the existing ADR template; use `/create-adr` only if that command is available. **When:** new dependency, storage strategy, platform target, core abstraction, cross-cutting pattern. **Not for:** bug fixes, styling, refactors.

After any Tauri command, new component/hook, data model change, or new integration: update `docs/ARCHITECTURE.md`, `docs/ABSTRACTIONS.md`, and/or `docs/GETTING-STARTED.md` in the same commit.

---

## 2. Product Rules

### Demo vault hygiene (`demo-vault/`, `demo-vault-v2/`)

Default to `demo-vault-v2/` for testing.

- Treat `demo-vault/` and `demo-vault-v2/` as disposable QA fixtures unless the task explicitly changes demo content.
- If you create untracked notes, attachments, or other temporary files there for testing, delete them before the task is complete.
- If you modify tracked demo-vault files only to test or QA behavior, revert those edits before the final commit.
- Before declaring a task done, make sure `git status --short -- demo-vault demo-vault-v2` is empty unless demo fixture changes are part of the task.
- If a fresh run starts and the only local dirt is inside `demo-vault/` or `demo-vault-v2/`, clean those paths first and continue. That case is recoverable QA residue, not a blocker.

### User vault (`~/Laputa/`)

Default to `demo-vault-v2/`. If you must use `~/Laputa/` for testing:
- **Never commit or push** any test notes to the remote vault
- **Delete all test notes from disk** when done — do not leave untitled or temporary notes on the filesystem. Remove only files created by this task and restore only task-owned edits. Never run a blanket checkout/clean on a user vault containing unrelated changes.
- **Rationale:** test notes pollute the local vault over time, making it a collection of nonsensical untitled files. The vault must stay clean on disk, not just on the remote.

### UI components — mandatory rules

**Always use shadcn/ui components.** Never use raw HTML form elements (`<input>`, `<select>`, `<button>`, native `<input type="date">`, etc.) for user-facing UI. Every interactive element must use the shadcn/ui equivalent:

| Need | Use |
|---|---|
| Text input | `Input` from shadcn/ui |
| Dropdown/select | `Select` from shadcn/ui |
| Date picker | `Calendar` + `Popover` from shadcn/ui (NOT native `<input type="date">`) |
| Button | `Button` from shadcn/ui |
| Autocomplete/combobox | Reuse existing combobox components from the app (check `src/components/`) |
| Wikilink picker | Reuse the wikilink autocomplete component already used in the editor and Properties panel |
| Emoji picker | Reuse the emoji picker component already used for note/type icons |
| Color picker | Reuse the color swatch picker used for type customization |
| Toggle/switch | `Switch` or `ToggleGroup` from shadcn/ui |
| Dialog/modal | `Dialog` from shadcn/ui |

**When in doubt:** search `src/components/` for an existing component before building new. **Visual language:** all new UI must feel native to Tolaria — if it looks like a browser default, it's wrong.

---

## 3. Reference

### macOS / Tauri gotchas

- `Option+N` → special chars on macOS. Use `e.code` or `Cmd+N`
- Tauri menu accelerators: `MenuItemBuilder::new(label).accelerator("CmdOrCtrl+1")`
- `app.set_menu()` replaces the ENTIRE menu bar — include all submenus
- `mock-tauri.ts` silently swallows Tauri calls — not a substitute for native testing

### QA scripts

```bash
bash ~/.openclaw/skills/tolaria-qa/scripts/focus-app.sh tolaria-memnova
bash ~/.openclaw/skills/tolaria-qa/scripts/screenshot.sh /tmp/out.png
bash ~/.openclaw/skills/tolaria-qa/scripts/shortcut.sh "command" "s"
```

### Diagrams

Prefer Mermaid (`flowchart`, `sequenceDiagram`, `classDiagram`, `stateDiagram-v2`). ASCII only for spatial wireframe layouts.
