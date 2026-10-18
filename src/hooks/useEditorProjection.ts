import { useLayoutEffect, useRef, useState, type MutableRefObject } from 'react'
import type { CachedTabState } from './editorBlockResolution'
import { invalidatePendingSwap } from './editorSwapToken'

interface ProjectionOptions {
  path: string | null
  identity?: string
  cacheRef: MutableRefObject<Map<string, CachedTabState>>
  pendingLocalRef: MutableRefObject<{ path: string; content: string } | null>
  contentPathRef: MutableRefObject<string | null>
  suppressRef: MutableRefObject<boolean>
  pendingSwapRef: MutableRefObject<(() => void) | null>
  sequenceRef: MutableRefObject<number>
}

/** A different face is a new editor view even when its filesystem path is unchanged. */
export function useEditorProjection(options: ProjectionOptions): boolean {
  const { path, identity, cacheRef, pendingLocalRef, contentPathRef, suppressRef, pendingSwapRef, sequenceRef } = options
  const previous = useRef({ path, identity })
  const [applied, setApplied] = useState<string | null>(null)
  const key = `${path ?? ''}\0${identity ?? ''}`
  useLayoutEffect(() => {
    const old = previous.current
    previous.current = { path, identity }
    if (old.path !== path || old.identity === identity) return
    invalidatePendingSwap({ pendingSwapRef: pendingSwapRef, swapSeqRef: sequenceRef })
    pendingLocalRef.current = null
    contentPathRef.current = null
    suppressRef.current = true
    if (path) cacheRef.current.delete(path)
  }, [path, identity, cacheRef, pendingLocalRef, contentPathRef, suppressRef, pendingSwapRef, sequenceRef])
  useLayoutEffect(() => {
    if (identity === undefined) return
    const ready = (event: Event) => {
      if ((event as CustomEvent<{ path: string }>).detail.path === path && contentPathRef.current === path) setApplied(key)
    }
    window.addEventListener('laputa:editor-tab-swapped', ready)
    return () => window.removeEventListener('laputa:editor-tab-swapped', ready)
  }, [identity, path, key, contentPathRef])
  return identity !== undefined && applied !== key
}
