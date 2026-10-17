---
type: ADR
id: "0137"
title: "Optional CodeScene integration for Memnova"
status: active
date: 2026-10-17
supersedes: "0064"
---

## Context

This fork inherited a mandatory external CodeScene prerequisite from Tolaria. Memnova has no configured CodeScene license, project API credentials, or MCP integration. The A01 baseline verified local build, lint, tests and coverage, but implementation was blocked solely by unavailable external analysis. The user explicitly requested updating the inherited agent instructions to fit Memnova and continuing implementation.

## Decision

CodeScene is optional when authenticated access is not configured. Record unavailable analysis as not run, continue implementation, and retain mandatory local lint, type checking, tests, coverage, Codacy security analysis, data-preservation QA and normal Git hooks. Do not request a service account merely to start coding.

When CodeScene access is configured, use before/after file reviews and project analysis. The values in `.codescene-thresholds` remain unchanged and must never be lowered or represented as measured scores. This supersedes ADR-0064 only for this fork's mandatory external-tool prerequisite, not its one-way threshold policy when the integration is in use.

## Consequences

Agent instructions reflect available local tools, permit direct translation when Lara credentials are unavailable, and use the current Memnova app identity for QA. Todoist and optional QA scripts are used only when actually available and relevant. Security findings and unavailable measurements remain explicit in task reports. No test, coverage, security rule or Git hook is bypassed by this decision.
