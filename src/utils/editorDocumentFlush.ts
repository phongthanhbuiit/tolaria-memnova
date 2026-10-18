/** Synchronous document producers, scoped by editor instance and block identity. */
const producers = new WeakMap<object, Map<string, () => boolean>>()
const flushing = new WeakSet<object>()

export function registerEditorDocumentFlush(editor: object, blockId: string, flush: () => boolean): () => void {
  let blocks = producers.get(editor)
  if (!blocks) { blocks = new Map(); producers.set(editor, blocks) }
  blocks.set(blockId, flush)
  return () => {
    if (blocks.get(blockId) !== flush) return
    blocks.delete(blockId)
    if (!blocks.size) producers.delete(editor)
  }
}

export function flushEditorDocuments(editor: object): boolean {
  if (flushing.has(editor)) return false
  flushing.add(editor)
  let changed = false
  try {
    for (const flush of [...(producers.get(editor)?.values() ?? [])]) {
      changed = flush() || changed
    }
    return changed
  } finally { flushing.delete(editor) }
}
