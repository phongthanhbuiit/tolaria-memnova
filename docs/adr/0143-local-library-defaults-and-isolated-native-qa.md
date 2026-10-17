---
type: ADR
id: "0143"
title: "Local Library defaults and isolated native QA"
status: active
date: 2026-10-17
supersedes: null
---

## Context

Memnova V1 is for learning from local lesson pages. Requiring Git or an AI setup prompt before that first action adds unrelated dependencies. Native QA must not reuse a remembered real Library, preferences or webview storage. SQLite WAL and backup events must not trigger lesson reloads, and generic Git staging cannot safely synchronize a live learning database.

## Decision

Treat unspecified Git/AI preferences as disabled; preserve explicit existing opt-ins. Creating an empty Library seeds the established content scaffolding without initializing Git. Existing folder opening is a primary action. Optional template download stays under Advanced, with both mouse and keyboard access. Git remains configurable through Settings; disabled Git surfaces do not expose repository cloning. The native AI bridge also requires explicit opt-in and stops when the frontend synchronizes a disabled preference.

Keep compatibility preference locations intact. Introduce an absolute `MEMNOVA_CONFIG_HOME` override only for debug builds, shared by settings and Library lists. Release builds ignore it. QA uses a separate Tauri identifier, incognito webview and disposable folder, without changing HOME or copying real user settings. Pin the frontend Tauri API to 2.10.1 to match the existing Rust 2.10 runtime minor version; frozen installation confirms no unrelated dependency changes.

Private learning paths are excluded from app Git staging even when already tracked. A private entry already staged by another tool causes an explicit error without changing the index; the app never silently unstages user changes. Initial Git setup excludes private paths too. Existing metadata ignore rules are preserved with an unconditional final exclusion. Generic Git history/discard/conflict operations reject private learning paths.

File-watch filtering evaluates `.memnova` relative to the active Library root, so WAL/backups do not cause lesson reload loops, while lessons inside a freshly restored Library remain watchable. Watch roots are canonicalized. Neither the storage schema nor learning algorithm changes in this step.

## Consequences

Learning works without network, Git or AI. Existing optional integrations are retained. Git cannot replace verified Library backups, and old commits that already contain learning data are not rewritten. Native QA is repeatable without risking user libraries. Browser fixtures explicitly model an existing installation with optional integrations enabled; separate new-install tests protect the disabled defaults.
