import { useCallback, useEffect, useRef, useState } from 'react'
import { getSnapshot, type TLStore } from 'tldraw'
import { registerEditorDocumentFlush } from '../utils/editorDocumentFlush'
import { emptyWhiteboardSnapshot, loadWhiteboardDocument, serializeWhiteboardSnapshot, type WhiteboardLoad } from './whiteboardSnapshot'

type LoadState = WhiteboardLoad & { store: TLStore; source: string }
interface Options { store: TLStore; snapshot: string; readOnly: boolean; documentScope?: object; blockId?: string; onSnapshotChange: (value: string) => void }
export function useWhiteboardDocument({ store,snapshot,readOnly,documentScope,blockId,onSnapshotChange }: Options) {
  const source = snapshot.trim(), saved = useRef<{ store: TLStore; source: string } | null>(null)
  const [load,setLoad] = useState<LoadState | null>(null), [attempt,setAttempt] = useState(0)
  const change = useRef(onSnapshotChange)
  useEffect(() => { change.current = onSnapshotChange },[onSnapshotChange])
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      const result = saved.current?.store === store && saved.current.source === source
        ? { status: 'ready' as const } : loadWhiteboardDocument(store,source)
      saved.current = result.status === 'ready' ? { store,source } : null
      setLoad({ ...result,store,source })
    })
    return () => { cancelled = true }
  },[store,source,attempt])
  useEffect(() => {
    if (readOnly || load?.status !== 'ready' || load.store !== store || load.source !== source) return
    let timer: number | null = null, pending = false
    const flush = () => {
      if (!pending) return false
      if (timer !== null) window.clearTimeout(timer)
      timer = null
      const next = serializeWhiteboardSnapshot(getSnapshot(store).document), before = saved.current?.source ?? ''
      const unchanged = next.trim() === before.trim() || (next.trim() === emptyWhiteboardSnapshot().json.trim() && (!before || before === '{}'))
      if (unchanged) { pending = false; return false }
      change.current(next)
      saved.current = { store,source: next.trim() }; pending = false
      return true
    }
    const unregister = documentScope && blockId ? registerEditorDocumentFlush(documentScope,blockId,flush) : () => {}
    const unlisten = store.listen(() => {
      pending = true
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(flush,350)
    },{ source: 'user',scope: 'document' })
    return () => {
      unlisten()
      try { flush() } finally { unregister(); if (timer !== null) window.clearTimeout(timer) }
    }
  },[store,source,readOnly,documentScope,blockId,load])
  const retry = useCallback(() => { saved.current = null; setAttempt(value => value + 1) },[])
  return { status: load?.store === store ? load.status : 'loading' as const, sourceReady: load?.store === store && load.source === source && load.status === 'ready',retry }
}
