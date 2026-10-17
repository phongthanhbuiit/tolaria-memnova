# ADR-0144: Focused commit checks, full push gates

Date: 2026-10-17

Status: Accepted

## Context

Running every frontend and backend test for each small edit duplicates the release gate and slows the feedback needed for regression-first fixes. Vitest can select tests through static imports, but Tauri IPC strings and shared configuration need conservative fallbacks.

## Decision

Use a pure staged-path planner in `scripts/precommit-checks.mjs`. Frontend leaf changes run related tests, changed-file lint and incremental TypeScript. Shared frontend configuration, deleted/renamed frontend paths and Rust IPC/schema entry points run the full frontend suite. Learning-only Rust edits run learning-module tests; other Rust edits run backend unit tests. Changed browser specs, localization and published docs receive their own checks. Hook/script changes run the planner's Node regression suite, also run by pre-push.

Use NUL-delimited Git paths and shell-free argv execution. Fail immediately if Git inspection or any selected check fails. Keep the full pre-push coverage, build and smoke gates and existing Rust change detection. Do not bypass hooks, lower coverage or use focused test results as full-release evidence.

## Consequences

Small edits get quick behavioral feedback; shared changes intentionally cost more. Related-test selection cannot discover every dynamic dependency, so a normal successful push remains mandatory. No runtime dependency, storage change or scheduling algorithm change is introduced. `--plan` makes selection reviewable before committing.
