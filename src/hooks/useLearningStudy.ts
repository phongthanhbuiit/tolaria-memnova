import { useCallback, useRef, useState } from 'react'
import type { LearningClient } from '../lib/learning/client'
import type { RateRequest, SessionScope, StudySession } from '../lib/learning/types'
import { scheduleReview } from '../lib/learning/scheduler'
import type { FSRSRating } from '../lib/fsrs'
import { trackEvent } from '../lib/telemetry'

type State = { libraryKey: string; open: boolean; busy: boolean; session: StudySession | null; error: string | null }
export function useLearningStudy(client: LearningClient | null, onCommitted: () => Promise<void>) {
  const libraryKey = client ? `${client.vaultPath}:${client.libraryId}` : ''
  const [state, setState] = useState<State>({ libraryKey: '', open: false, busy: false, session: null, error: null })
  const saving = useRef(false)
  const pending = useRef<RateRequest | null>(null)
  const started = useRef(Date.now())
  const scope = useRef<SessionScope>({ pageIds: null })
  const current = state.libraryKey === libraryKey ? state : { libraryKey, open: false, busy: false, session: null, error: null }
  const start = useCallback(async (value: SessionScope = { pageIds: null }) => {
    if (!client || saving.current) return
    scope.current = value; pending.current = null; saving.current = true
    setState({ libraryKey, open: true, busy: true, session: null, error: null })
    try {
      const session = await client.startSession(value); started.current = Date.now()
      setState({ libraryKey, open: true, busy: false, session, error: null })
      trackEvent('memnova_study_started', { scoped: value.pageIds === null ? 0 : 1, cards: session.initialCount })
    } catch (error) { setState({ libraryKey, open: true, busy: false, session: null, error: String(error) }) }
    finally { saving.current = false }
  }, [client, libraryKey])
  const reload = useCallback(async () => {
    if (!client || saving.current) return
    if (!current.session) { await start(scope.current); return }
    saving.current = true; setState(previous => ({ ...previous, busy: true }))
    try { const session = await client.getSession(current.session.id); pending.current = null; started.current = Date.now(); setState({ libraryKey, open: true, busy: false, session, error: null }) }
    catch (error) { setState(previous => ({ ...previous, busy: false, error: String(error) })) }
    finally { saving.current = false }
  }, [client, libraryKey, current.session, start])
  const rate = useCallback(async (rating: FSRSRating) => {
    const session = current.session
    const item = session?.current
    if (!client || !session || !item?.page || saving.current) return
    saving.current = true
    try {
      if (!pending.current) {
        const now = new Date()
        pending.current = { reviewId: crypto.randomUUID(), sessionId: session.id, sessionRevision: session.revision, cardId: item.card.id, cardRevision: item.card.revision, sourceFingerprint: item.page.fingerprint, rating, durationMs: Math.min(86_400_000, Math.max(0, now.getTime() - started.current)), reviewedAt: now.getTime(), schedule: scheduleReview(item.card.schedule, rating, now) }
      }
      setState(previous => ({ ...previous, busy: true, error: null }))
      const appliedRating = pending.current.rating
      const result = await client.rateCard(pending.current)
      pending.current = null; started.current = Date.now()
      setState({ libraryKey, open: true, busy: true, session: result.session, error: null })
      if (!result.replayed) trackEvent('memnova_review_saved', { rating: appliedRating, engine: 'ts-fsrs@5.4.2' })
      await onCommitted()
    } catch (error) { setState(previous => ({ ...previous, busy: false, error: String(error) })) }
    finally { saving.current = false; setState(previous => previous.libraryKey === libraryKey ? { ...previous, busy: false } : previous) }
  }, [client, libraryKey, current.session, onCommitted])
  const undo = useCallback(async () => {
    const session = current.session
    if (!client || !session?.lastReviewId || saving.current) return
    saving.current = true; setState(previous => ({ ...previous, busy: true }))
    try { const value = await client.undoReview(session.id, session.lastReviewId, session.revision); pending.current = null; started.current = Date.now(); setState({ libraryKey, open: true, busy: true, session: value, error: null }); trackEvent('memnova_review_undone'); await onCommitted() }
    catch (error) { setState(previous => ({ ...previous, busy: false, error: String(error) })) }
    finally { saving.current = false; setState(previous => previous.libraryKey === libraryKey ? { ...previous, busy: false } : previous) }
  }, [client, libraryKey, current.session, onCommitted])
  const close = useCallback(async () => {
    if (saving.current || pending.current) return
    try { if (client && current.session?.status === 'active') await client.pauseSession(current.session.id, current.session.revision); setState(previous => ({ ...previous, open: false })) }
    catch (error) { setState(previous => ({ ...previous, error: String(error) })) }
  }, [client, current.session])
  const skip = useCallback(async () => {
    if (!client || !current.session || saving.current || pending.current) return
    saving.current = true
    try { const session = await client.skipSessionCard(current.session.id, current.session.revision); started.current = Date.now(); setState({ libraryKey, open: true, busy: false, session, error: null }) }
    catch (error) { setState(previous => ({ ...previous, busy: false, error: String(error) })) }
    finally { saving.current = false }
  }, [client, libraryKey, current.session])
  return { ...current, start, reload, rate, undo, close, skip, retry: () => pending.current ? rate(pending.current.rating) : reload(), hasPending: !!pending.current }
}
