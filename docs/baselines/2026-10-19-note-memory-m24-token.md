# M24 follow-up — keep durable tokens opaque to Markdown

**Final status: DONE** with the M24 source release66c8ed23/a376ee11. [M25](2026-10-19-note-memory-m25.md) records the successful normal push and final gates; pending statements below describe the original checkpoint.

Starting main91a96836; the first M24 verified commit attempt was cancelled after its4,887frontend tests passed and its dev1000-shape regression exposed a token paragraph. No commit/push was claimed. The live scene contained random shape IDs whose underscores formed Markdown emphasis. The earlier production run happened not to generate that combination.

Four deterministic real BlockNote parser regressions failed before production edits: the reproduced underscore IDs, asterisk text, tilde text and mixed Unicode/Markdown punctuation. URI encoding leaves inline Markdown delimiters unescaped; the codec then received styled/split text instead of one opaque token. The shared temporary encoder now percent-escapes the remaining delimiters. Persisted fences, snapshots, ordinary Markdown formatting, schema and decoder compatibility are unchanged. No new abstraction/ADR/dependency or user-data migration.

GREEN:22tests/4files665ms including4real parser regressions, existing tldraw/Mermaid/durable round-trips. Codacy7changed paths:ESLint0/Opengrep0, one reviewed false Medium Lizard function-length warning: encodePayload is4lines, not the217lines the regex parser attributes to it. No suppression or new Critical/High. CodeScene before/after NOT RUN optional unavailable. Localization:no UI copy changes. PostHog:no event needed for opaque-token correctness. Production/native builds14.13s/10.23s succeeded. Affected browser/native/scale acceptance is recorded in the main M24 baseline after rebuilding.

The two syntax-sensitive shape IDs are now deterministic scale-fixture records; they must remain in the regression so random IDs cannot hide this defect. Final M24 source and release hooks/push remain required.
