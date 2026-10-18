import { useCallback, useEffect, useRef, useState } from 'react'
import type { LearningClient } from '../../lib/learning/client'
import type { ConversionBackChoice, ConversionFaceChoice, ConversionMemoryChoice, NoteConversionPage, NoteConversionPreview, NoteConversionRequest, NoteConversionResult } from '../../lib/learning/noteConversionTypes'
import { trackEvent } from '../../lib/telemetry'
import { registerSelectedSource, SourceRegistrationError } from '../../lib/learning/sourceSelection'

export type NoteConversionApi = Pick<LearningClient, 'vaultPath' | 'libraryId' | 'previewNoteConversion' | 'applyNoteConversion' | 'resumeNoteConversion' | 'noteConversionDetails' | 'noteCompatibility' | 'listNoteRecovery' | 'readNoteRecovery' | 'resolveNoteRecovery' | 'resumeNoteMemory'> & Partial<Pick<LearningClient, 'previewNoteSource' | 'ensurePage'>>
export interface ConversionDraft { front: ConversionFaceChoice | null; back: ConversionBackChoice | null; memory: ConversionMemoryChoice | null }
const emptyDraft = (): ConversionDraft => ({ front: null, back: null, memory: null })
const convertiblePage = (page: NoteConversionPage) => !page.activeSessionCount && ['matching','conflict','multiple','wholePage','trashed','legacyMarkdown'].includes(page.classification)
export const canConvertPage = (page: NoteConversionPage) => Boolean(page.pageId) && convertiblePage(page)
export const conversionRows = (preview: NoteConversionPreview) => preview.pages.filter(page => page.candidates.length || page.classification === 'legacyMarkdown' || page.classification === 'pending')
interface State { client: NoteConversionApi | null; preview: NoteConversionPreview | null; selectedPath: string | null; draft: ConversionDraft; busy: boolean; error: string | null; result: NoteConversionResult | null; refreshPending: boolean; registrationPartial: boolean; skipped: string[] }
const initial = (client: NoteConversionApi | null): State => ({ client, preview: null, selectedPath: null, draft: emptyDraft(), busy: false, error: null, result: null, refreshPending: false, registrationPartial: false, skipped: [] })
function firstPage(preview: NoteConversionPreview, skipped: string[] = []) { return conversionRows(preview).find(page => !skipped.includes(page.path) && page.classification !== 'bound')?.path ?? null }
export function useNoteConversion({ client, open, flush, onUpdated }: { client: NoteConversionApi | null; open: boolean; flush: () => Promise<unknown>; onUpdated: () => Promise<unknown> }) {
  const [state,setState] = useState(() => initial(client))
  const visit = useRef<object | null>(null), locked = useRef(false)
  const attempt = useRef<NoteConversionRequest | null>(null), committed = useRef<NoteConversionResult | null>(null)
  const current = state.client === client && open ? state : initial(client)
  const selected = current.preview?.pages.find(page => page.path === current.selectedPath) ?? null
  useEffect(() => {
    const owner = {}; visit.current = owner; locked.current = false; attempt.current = null; committed.current = null
    setState({ ...initial(client), busy: Boolean(open && client) })
    if (open && client) void client.previewNoteConversion().then(preview => {
      if (visit.current !== owner) return
      setState({ ...initial(client), preview, selectedPath: firstPage(preview) })
      trackEvent('memnova_note_conversion_previewed', { pages: preview.pages.length, candidates: preview.pages.reduce((n,page) => n + page.candidates.length,0) })
    }).catch(error => { if (visit.current === owner) setState({ ...initial(client),error: String(error) }) })
    return () => { if (visit.current === owner) visit.current = null }
  },[client,open])
  const selectPage = useCallback((id: string) => {
    if (locked.current || attempt.current) return
    setState(previous => { const page = previous.preview?.pages.find(page => page.path === id || page.pageId === id); return page ? { ...previous, selectedPath: page.path, draft: emptyDraft(), error: null, result: null } : previous })
  },[])
  const setDraft = useCallback((draft: ConversionDraft) => { if (!locked.current && !attempt.current) setState(previous => ({ ...previous,draft })) },[])
  const refresh = async (owner: object, preferredPath?: string) => {
    await onUpdated()
    if (visit.current !== owner || !client) return
    const preview = await client.previewNoteConversion()
    if (visit.current !== owner) return
    attempt.current = null; committed.current = null
    setState(previous => ({ ...previous, preview, selectedPath: preferredPath && conversionRows(preview).some(page => page.path === preferredPath) ? preferredPath : firstPage(preview,previous.skipped), draft: emptyDraft(), refreshPending: false, registrationPartial: false, error: null }))
  }
  const canApply = Boolean(client && open && !current.busy && (current.refreshPending || attempt.current || current.preview?.state === 'ready' && selected && canConvertPage(selected) && current.draft.front && current.draft.back && current.draft.memory && (current.draft.memory.kind === 'fresh' || current.draft.memory.confirmedSameGoal)))
  const apply = async () => {
    const owner = visit.current
    if (!owner || !client || locked.current || !canApply) return
    locked.current = true; setState(previous => ({ ...previous,busy: true,error: null }))
    try {
      if (committed.current) { await refresh(owner); return }
      const { front,back,memory } = current.draft
      if (!attempt.current) {
        if (!selected?.pageId || !front || !back || !memory) return
        attempt.current = { operationId: crypto.randomUUID(),pageId: selected.pageId,expectedFingerprint: selected.fingerprint,front,back,memory }
      }
      await flush()
      if (visit.current !== owner) return
      const result = await client.applyNoteConversion(attempt.current)
      if (visit.current !== owner) return
      setState(previous => ({ ...previous,result }))
      trackEvent('memnova_note_conversion_result', { status: result.outcome.status, retainedCards: result.retainedLegacyCards })
      if (result.outcome.status === 'committed' || result.outcome.status === 'discarded') {
        committed.current = result; setState(previous => ({ ...previous,refreshPending: true }))
        await refresh(owner)
      }
    } catch (error) {
      if (visit.current === owner) { setState(previous => ({ ...previous,error: String(error) })); trackEvent('memnova_note_conversion_failed', { stage: committed.current ? 'refresh' : 'apply' }) }
    } finally { if (visit.current === owner) { locked.current = false; setState(previous => ({ ...previous,busy: false })) } }
  }
  const reload = async () => {
    const owner = visit.current
    if (!owner || !client || locked.current) return
    locked.current = true; setState(previous => ({ ...previous,busy: true,error: null }))
    try {
      if (committed.current) await refresh(owner)
      else { const preview = await client.previewNoteConversion(); if (visit.current === owner) { attempt.current = null; setState(previous => ({ ...previous,preview,selectedPath: firstPage(preview,previous.skipped),draft: emptyDraft(),result: null })) } }
    } catch (error) { if (visit.current === owner) setState(previous => ({ ...previous,error: String(error) })) }
    finally { if (visit.current === owner) { locked.current = false; setState(previous => ({ ...previous,busy: false })) } }
  }
  const skip = () => {
    if (!selected || locked.current || attempt.current) return
    setState(previous => { const skipped = [...previous.skipped,selected.path]; return { ...previous,skipped,selectedPath: previous.preview ? firstPage(previous.preview,skipped) : null,draft: emptyDraft(),error: null } })
  }
  const canPrepareIdentity = Boolean(client?.previewNoteSource && client.ensurePage && current.preview?.state === 'ready' && selected && !selected.pageId && selected.sourceHash && convertiblePage(selected) && !current.busy && !attempt.current)
  const prepareIdentity = async () => {
    const owner = visit.current
    if (!owner || !client?.previewNoteSource || !client.ensurePage || !selected || !canPrepareIdentity || locked.current) return
    locked.current = true; setState(previous => ({ ...previous, busy: true, error: null }))
    let registered = false
    try {
      await flush()
      if (visit.current !== owner) return
      const latest = (await client.previewNoteConversion()).pages.find(page => page.path === selected.path)
      if (visit.current !== owner) return
      if (!latest || latest.pageId || latest.fingerprint !== selected.fingerprint || latest.sourceHash !== selected.sourceHash || !convertiblePage(latest)) throw Error('conversion-preview-changed')
      const source = await client.previewNoteSource(selected.path, 'front')
      if (visit.current !== owner) return
      if (source.sourceHash !== selected.sourceHash) throw Error('conversion-preview-changed')
      await registerSelectedSource({ vaultPath: client.vaultPath, previewNoteSource: client.previewNoteSource.bind(client), ensurePage: client.ensurePage.bind(client) }, source, () => visit.current === owner)
      registered = true
      if (visit.current !== owner) return
      await refresh(owner, selected.path)
      trackEvent('memnova_note_conversion_identity_prepared')
    } catch (error) {
      if (visit.current === owner) setState(previous => ({ ...previous, error: String(error), registrationPartial: registered || error instanceof SourceRegistrationError && error.registrationAttempted }))
    } finally { if (visit.current === owner) { locked.current = false; setState(previous => ({ ...previous, busy: false })) } }
  }
  return { ...current,selected,setDraft,selectPage,canApply,apply,reload,skip,canPrepareIdentity,prepareIdentity,inputsLocked: current.busy || Boolean(attempt.current) }
}
