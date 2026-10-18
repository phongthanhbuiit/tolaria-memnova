# Note memory M01 document codec

Dependency M00: `855ea883`, verified normal remote push. Scope: pure frontend codec and shared golden data; no runtime editor routing, schema or user-data conversion.

The codec preserves BOM/CRLF, UTF-8 ranges, unknown frontmatter and the unedited face. It recognizes a standalone delimiter outside fences, inline code and comments; reports duplicate/invalid/future owned configuration; and patches only changed owned fields. Disabled learning retains reverse content. Structural edits cannot introduce an unintended face or swallow its delimiter into a fence. Existing legacy helpers remain unchanged.

TDD: the initial new-module test is RED at import resolution, not a claimed behavioral baseline. Additional executed REDs then reproduce five BOM/configuration/boundary defects in the first implementation, two unintended-boundary defects, and one UUID-spelling rewrite. Each is GREEN after the corresponding patch. Final focused run: **72 tests / four files pass, 839ms**, including50 codec tests and existing legacy splitter/tldraw/durable-block suites. The shared data has28 parse cases and seven byte-exact patch cases for native parity. Full learning module before the final behavior-preserving extraction: **144 tests / 30 files pass,16.76s**; final related tests/types/lint are verified again in pre-commit.

`pnpm exec tsc -b` and ESLint pass. Codacy0.24.0 scans all five new TS code/test files using ESLint9, Opengrep and Lizard. ESLint/Opengrep report zero findings. Lizard reports one Medium function-length advisory and one Minor complexity12. Reviewed Medium: it attributes58 lines to `memoryScalar`, whose actual function is six lines and ends before several separate declarations; this is a TS lexical-analysis boundary artifact, not an actual58-line function or security issue. The remaining complexity is the guarded document/header/range projection. No suppressions or new Critical/High findings. CodeScene before/after: NOT RUN, optional integration unavailable; no score inferred.

ADR-0147 records staged Markdown ownership and compatibility boundaries. ARCHITECTURE/ABSTRACTIONS updated. No UI copy changes, localization not needed. PostHog: no event needed because this is an internal pure codec, not an exposed action. No data/FS/SQL operations in the new codec. Demo fixtures untouched.

Whole-run execution uses committed, verified local dependencies and normal batch pushes; VERIFIED_LOCAL is not DONE. Single-task delegation still requires pushed dependencies. This avoids rerunning the full gate for every foundation step while preserving final normal hooks.

Evidence: `/tmp/memnova-note-memory-evidence/m01/`, including all RED logs, GREEN/module logs and Codacy SARIF. Commit/push outcomes are entered in the implementation ledger after execution. Native/coverage are not remeasured for this staged checkpoint; full batch gates and M23/M25 remain required.
