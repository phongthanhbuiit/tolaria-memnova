export type DocumentRenderStatus = 'loading' | 'ready' | 'error'
export function createDocumentRenderGate(ids: readonly string[], changed: (status: DocumentRenderStatus) => void) {
  const states = new Map(ids.map(id => [id,'loading' as DocumentRenderStatus]))
  let active = false, last: DocumentRenderStatus | null = null
  const emit = () => {
    if (!active) return
    const values = [...states.values()]
    const status = values.includes('error') ? 'error' : values.every(value => value === 'ready') ? 'ready' : 'loading'
    if (status !== last) { last = status; changed(status) }
  }
  return {
    start() { active = true; last = null; emit() },
    dispose() { active = false },
    report(id: string, status: DocumentRenderStatus) {
      if (!states.has(id)) return
      states.set(id,status); emit()
    },
  }
}
export function documentCanvasIds(blocks: unknown[]): string[] {
  return blocks.flatMap(block => {
    if (!block || typeof block !== 'object') return []
    const value = block as Record<string,unknown>
    const own = value.type === 'tldrawBlock' ? [typeof value.id === 'string' ? value.id : 'missing-canvas-id'] : []
    return [...own,...(Array.isArray(value.children) ? documentCanvasIds(value.children) : [])]
  })
}
