import { createTLStore, loadSnapshot, type TLStore, type TLStoreSnapshot } from 'tldraw'

export type WhiteboardLoad = { status: 'ready' } | { status: 'error' }
export function serializeWhiteboardSnapshot(snapshot: unknown): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`
}
export function whiteboardDocumentSnapshot(store: TLStore) { return store.getStoreSnapshot('document') }
let empty: ReturnType<typeof whiteboardDocumentSnapshot> | null = null
export function emptyWhiteboardSnapshot() {
  empty ??= whiteboardDocumentSnapshot(createTLStore())
  return { document: empty, json: serializeWhiteboardSnapshot(empty) }
}

/** Never falls back to empty after a failed or unsupported existing snapshot. */
export function loadWhiteboardDocument(store: TLStore, raw: string): WhiteboardLoad {
  try {
    if (!raw.trim() || raw.trim() === '{}') {
      loadSnapshot(store, emptyWhiteboardSnapshot().document)
    } else {
      const snapshot: unknown = JSON.parse(raw)
      if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return { status: 'error' }
      loadSnapshot(store, snapshot as TLStoreSnapshot)
    }
    return { status: 'ready' }
  } catch { return { status: 'error' } }
}
