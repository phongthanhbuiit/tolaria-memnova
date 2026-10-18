import { useCallback, useEffect, useRef, useState } from 'react'
import type { NoteRecoverySummary, NoteRecoveryView } from '../../lib/learning/noteConversionTypes'
import type { NoteConversionApi } from './useNoteConversion'
import { trackEvent } from '../../lib/telemetry'
interface State { client: NoteConversionApi | null; rows: NoteRecoverySummary[]; view: NoteRecoveryView | null; busy: boolean; error: string | null; refreshPending: boolean; kept: boolean }
const initial = (client: NoteConversionApi | null): State => ({ client,rows: [],view: null,busy: false,error: null,refreshPending: false,kept: false })
export function useNoteRecovery({ client,open,onUpdated }: { client: NoteConversionApi | null; open: boolean; onUpdated: () => Promise<unknown> }) {
  const [state,setState] = useState(() => initial(client)), active = useRef<object | null>(null), locked = useRef(false), completed = useRef(false), read = useRef(0)
  const current = state.client === client && open ? state : initial(client)
  const load = useCallback(async (owner: object, id?: string) => {
    if (!client) return
    const sequence = ++read.current
    const rows = await client.listNoteRecovery(true)
    if (active.current !== owner || sequence !== read.current) return
    const selected = id ? rows.find(row => row.operationId === id) : rows.find(row => row.phase !== 'applied') ?? rows[0]
    const view = selected ? await client.readNoteRecovery(selected.operationId) : null
    if (active.current === owner && sequence === read.current) setState(previous => ({ ...previous,rows,view }))
  },[client])
  useEffect(() => {
    const owner = {}; active.current = owner; locked.current = false; completed.current = false; read.current++
    setState({ ...initial(client),busy: Boolean(open && client) })
    if (open && client) void load(owner).catch(error => { if (active.current === owner) setState(previous => ({ ...previous,error: String(error) })) }).finally(() => { if (active.current === owner) setState(previous => ({ ...previous,busy: false })) })
    return () => { if (active.current === owner) active.current = null }
    // load is scoped to this exact client visit; user actions use their current render.
  },[client,open,load])
  const select = async (id: string) => {
    const owner = active.current
    if (!owner || !client || locked.current || current.refreshPending) return
    const sequence = ++read.current; setState(previous => ({ ...previous,busy: true,error: null,kept: false }))
    try { const view = await client.readNoteRecovery(id); if (active.current === owner && sequence === read.current) setState(previous => ({ ...previous,view })) }
    catch (error) { if (active.current === owner) setState(previous => ({ ...previous,error: String(error) })) }
    finally { if (active.current === owner && sequence === read.current) setState(previous => ({ ...previous,busy: false })) }
  }
  const perform = async (kind: 'keep' | 'resume') => {
    const owner = active.current, view = current.view
    if (!owner || !client || !view || locked.current) return
    locked.current = true; setState(previous => ({ ...previous,busy: true,error: null }))
    try {
      if (!completed.current) {
        const outcome = kind === 'keep' ? await client.resolveNoteRecovery({ operationId: view.operationId,expectedCurrentHash: view.currentHash,choice: 'keepDisk' }) : await client.resumeNoteMemory(view.operationId)
        if (active.current !== owner) return
        if (outcome.status === 'committed' || outcome.status === 'discarded') {
          completed.current = true; setState(previous => ({ ...previous,refreshPending: true,kept: outcome.status === 'discarded' }))
          const row = current.rows.find(row => row.operationId === view.operationId)
          trackEvent('memnova_note_recovery_resolved', { kind: row?.kind ?? 'save', choice: kind, status: outcome.status, source: view.currentHash !== null ? 'available' : 'missing' })
        }
      }
      if (completed.current) await onUpdated()
      if (active.current !== owner) return
      await load(owner,view.operationId)
      if (active.current === owner) { completed.current = false; setState(previous => ({ ...previous,refreshPending: false })) }
    } catch (error) { if (active.current === owner) setState(previous => ({ ...previous,error: String(error) })) }
    finally { if (active.current === owner) { locked.current = false; setState(previous => ({ ...previous,busy: false })) } }
  }
  const reload = async () => {
    const owner = active.current
    if (!owner || locked.current) return
    if (completed.current) return perform('keep')
    locked.current = true; setState(previous => ({ ...previous,busy: true,error: null }))
    try { await load(owner,current.view?.operationId) } catch (error) { if (active.current === owner) setState(previous => ({ ...previous,error: String(error) })) }
    finally { if (active.current === owner) { locked.current = false; setState(previous => ({ ...previous,busy: false })) } }
  }
  return { ...current,select,perform,reload }
}
