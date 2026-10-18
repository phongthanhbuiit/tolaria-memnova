import { useCallback, useEffect, useRef, useState } from 'react'
import { type TLStore } from 'tldraw'
import { registerEditorDocumentFlush } from '../utils/editorDocumentFlush'
import { whiteboardDocumentSnapshot, loadWhiteboardDocument, serializeWhiteboardSnapshot, type WhiteboardLoad } from './whiteboardSnapshot'

type LoadState = WhiteboardLoad & { store: TLStore; source: string }
interface Options { store: TLStore; snapshot: string; readOnly: boolean; documentScope?: object; blockId?: string; onSnapshotChange: (value: string) => void }
export function useWhiteboardDocument({ store,snapshot,readOnly,documentScope,blockId,onSnapshotChange }: Options) {
  const source = snapshot.trim(), saved = useRef<{ store: TLStore; source: string; document: string } | null>(null)
  const [load,setLoad] = useState<LoadState | null>(null), [attempt,setAttempt] = useState(0)
  const change = useRef(onSnapshotChange)
  useEffect(() => { change.current = onSnapshotChange },[onSnapshotChange])
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      const echoed = saved.current?.store === store && saved.current.source === source
      const result = echoed ? { status: 'ready' as const } : loadWhiteboardDocument(store,source)
      if (!echoed) saved.current = result.status === 'ready' ? { store,source,document: serializeWhiteboardSnapshot(whiteboardDocumentSnapshot(store)) } : null
      setLoad({ ...result,store,source })
    })
    return () => { cancelled = true }
  },[store,source,attempt])
  useEffect(() => {
    if (readOnly || load?.status !== 'ready' || load.store !== store || load.source !== source) return
    let timer: number | null = null
    const flush = () => {
      if (timer !== null) window.clearTimeout(timer)
      timer = null
      const next = serializeWhiteboardSnapshot(whiteboardDocumentSnapshot(store))
      if (next === saved.current?.document) return false
      change.current(next)
      saved.current = { store,source: next.trim(),document: next }
      return true
    }
    const unregister = documentScope && blockId ? registerEditorDocumentFlush(documentScope,blockId,flush) : () => {}
    const unlisten = store.listen(() => {
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
