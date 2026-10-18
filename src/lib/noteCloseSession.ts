export interface NoteCloseRequest { token: string; target: 'app' | 'window' }
export type NoteCloseStatus = { kind: 'idle' } | { kind: 'saving' | 'failed'; target: NoteCloseRequest['target'] }
interface CloseDependencies {
  pending: () => Promise<NoteCloseRequest | null>
  acknowledge: (token: string, saved: boolean) => Promise<void>
  flush: () => Promise<void>
  status: (status: NoteCloseStatus) => void
}

/** A cancelled save may finish, but cannot authorize another close without a fresh flush. */
export function createNoteCloseSession(deps: CloseDependencies) {
  let disposed = false
  let activeToken: string | undefined
  let tail = Promise.resolve()
  const processing = new Set<string>()
  const isActive = (token: string) => !disposed && activeToken === token

  async function run(request: NoteCloseRequest) {
    if (!isActive(request.token)) return
    const pending = await deps.pending()
    if (pending?.token !== request.token || !isActive(request.token)) return
    try {
      await deps.flush()
      if (isActive(request.token)) await deps.acknowledge(request.token, true)
    } catch {
      if (!isActive(request.token)) return
      deps.status({ kind: 'failed', target: request.target })
      await deps.acknowledge(request.token, false).catch(() => {})
    }
  }

  async function request(request: NoteCloseRequest) {
    if (disposed || processing.has(request.token)) return
    processing.add(request.token)
    try {
      const pending = await deps.pending()
      if (disposed || pending?.token !== request.token) return
      activeToken = request.token
      deps.status({ kind: 'saving', target: pending.target })
      const work = tail.then(() => run(pending))
      tail = work.catch(() => {})
      await work
    } catch {
      if (isActive(request.token)) deps.status({ kind: 'failed', target: request.target })
    } finally {
      processing.delete(request.token)
    }
  }

  return {
    request,
    cancel(request: NoteCloseRequest) {
      if (!isActive(request.token)) return
      activeToken = undefined
      deps.status({ kind: 'failed', target: request.target })
    },
    dispose() { disposed = true; activeToken = undefined },
  }
}
