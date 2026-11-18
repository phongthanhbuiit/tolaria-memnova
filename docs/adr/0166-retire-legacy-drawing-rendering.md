# ADR-0166 — Bỏ hỗ trợ hiển thị định dạng bản vẽ cũ

Accepted 2026-11-19. Supersedes the remaining legacy drawing behavior in ADR-0107. ADR-0165 remains the decision for new and editable drawings.

## Decision

Excalidraw is the only drawing runtime. Recognize legacy fenced blocks by their existing on-disk identifiers for compatibility. In the rich editor, represent the whole fence as an opaque durable block and serialize its original source. In a study view, replace it with a localized notice before rendering, including if parsing fails. The source action opens the original Markdown note in raw mode. Opening or studying an older file requires no migration, dependency or runtime license.

## Consequences

The application neither renders the old engine nor converts user drawings. The disposable demo fixture is intentionally replaced by an Excalidraw representation of the same stroke. Treat legacy fences as stored source and keep them intact when editing surrounding prose.
