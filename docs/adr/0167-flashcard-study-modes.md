# ADR-0167 — Kiểu ôn flashcard

Accepted 2026-11-19.

## Decision

Flashcard review offers flip, typed answer and multiple choice on the existing legacy card lane. The client remembers a mode per Library and deck. A selected mode configures presentation only. Typed and multiple-choice feedback requires an explicit user rating before using the existing FSRS transaction. Cards with an unsupported answer fall back to the ordinary flip interaction.

Challenge runs a fixed ten-question practice round in renderer memory. It cannot call session or review writes and does not contribute to FSRS. Choice options come from distinct short answers in the same deck. Analytics record mode and aggregate counts only.

## Consequences

The existing persisted card, scheduling and session formats are unchanged. The existing note-review lane, keyboard ratings and undo remain available. No new dependencies or external content assets are required.
