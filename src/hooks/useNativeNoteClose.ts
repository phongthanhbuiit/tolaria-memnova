import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isTauri } from '../mock-tauri'
import { flushRegisteredNoteChanges } from '../lib/noteCloseFlush'
import { createNoteCloseSession, type NoteCloseRequest, type NoteCloseStatus } from '../lib/noteCloseSession'
import { cleanupTauriEventListener, type TauriUnlisten } from '../utils/tauriEventCleanup'

export function useNativeNoteClose() {
  const [status, setStatus] = useState<NoteCloseStatus>({ kind: 'idle' })
  useEffect(() => {
    if (!isTauri()) return
    let disposed = false
    const unlisteners: TauriUnlisten[] = []
    const pending = () => invoke<NoteCloseRequest | null>('pending_note_close')
    const session = createNoteCloseSession({
      pending,
      acknowledge: (token, saved) => invoke('acknowledge_note_close', { acknowledgement: { token, saved } }),
      flush: flushRegisteredNoteChanges,
      status: next => { flushSync(() => setStatus(next)) },
    })
    const retain = (unlisten: TauriUnlisten) => {
      if (disposed) cleanupTauriEventListener(unlisten)
      else unlisteners.push(unlisten)
    }
    async function connect() {
      retain(await listen<NoteCloseRequest>('note-close-requested', e => { void session.request(e.payload) }))
      retain(await listen<{ request: NoteCloseRequest }>('note-close-cancelled', e => session.cancel(e.payload.request)))
      if (disposed) return
      const request = await pending()
      if (request) await session.request(request)
    }
    // If the bridge is unavailable, native timeout keeps the window open.
    void connect().catch(() => {})
    return () => {
      disposed = true
      session.dispose()
      for (const unlisten of unlisteners) cleanupTauriEventListener(unlisten)
    }
  }, [])
  return {
    status,
    dismiss: () => setStatus({ kind: 'idle' }),
    retry: async () => {
      if (status.kind !== 'failed') return
      try { await invoke('retry_note_close', { target: status.target }) } catch { /* Keep failure visible. */ }
    },
  }
}
