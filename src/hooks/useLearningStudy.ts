import type { ReviewPresentation } from '../lib/learning/flashcardStudyMode'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LearningClient } from '../lib/learning/client'
import type { RateRequest, SessionScope, StudySession } from '../lib/learning/types'
import { scheduleReview } from '../lib/learning/scheduler'
import type { FSRSRating } from '../lib/fsrs'
import { trackEvent } from '../lib/telemetry'

type Accuracy = { answered: number; correct: number }

function studyAccuracy(scores: Map<string, boolean>): Accuracy {
  return { answered: scores.size, correct: [...scores.values()].filter(Boolean).length }
}

type State = { libraryKey: string; open: boolean; busy: boolean; session: StudySession | null; error: string | null; presentation: ReviewPresentation; presentationVersion: number; accuracy: Accuracy }
const initial = (libraryKey: string): State => ({ libraryKey, open: false, busy: false, session: null, error: null, presentation: { mode: 'flip' }, presentationVersion: 0, accuracy: { answered: 0, correct: 0 } })

export function useLearningStudy(client: LearningClient | null, onCommitted: () => Promise<void>) {
  const libraryKey = client ? `${client.vaultPath}:${client.libraryId}` : ''
  const [state, setState] = useState<State & { owner?: object }>(() => initial(''))
  // A new visit gets its own operation state, including A -> B -> A transitions.
  const visit = useMemo(() => ({ libraryKey, saving: false, pending: null as RateRequest | null, started: Date.now(), scope: { pageIds: null } as SessionScope, needsRefresh: false, presentation: { mode: 'flip' } as ReviewPresentation, presentationVersion: 0, scoreSession: '', scores: new Map<string, boolean>(), pendingScore: undefined as boolean | undefined }), [libraryKey])
  const active = useRef<typeof visit | null>(visit)
  useEffect(() => {
    active.current = visit
    return () => { if (active.current === visit) active.current = null }
  }, [visit])
  const current: State = state.owner === visit ? state : initial(libraryKey)
  const isCurrent = useCallback(() => active.current === visit, [visit])
  const update = useCallback((patch: Partial<State>) => {
    setState(previous => isCurrent() ? { ...(previous.owner === visit ? previous : initial(libraryKey)), ...patch, owner: visit } : previous)
  }, [isCurrent, libraryKey, visit])
  const run = useCallback(async (operation: () => Promise<void>) => {
    if (!isCurrent() || visit.saving) return
    visit.saving = true
    update({ busy: true, error: null })
    try { await operation() }
    catch (error) { update({ error: String(error) }) }
    finally { visit.saving = false; update({ busy: false }) }
  }, [isCurrent, visit, update])
  const accept = useCallback((session: StudySession) => {
    if (!isCurrent()) return false
    visit.started = Date.now()
    if (visit.scoreSession !== session.id) {
      visit.scoreSession = session.id
      visit.scores.clear()
    }
    update({ session, open: true, accuracy: studyAccuracy(visit.scores) })
    return true
  }, [isCurrent, visit, update])
  const refreshCommitted = useCallback(async () => {
    if (!isCurrent()) return
    visit.needsRefresh = true
    await onCommitted()
    visit.needsRefresh = false
  }, [isCurrent, visit, onCommitted])
  const start = useCallback(async (scope: SessionScope = { pageIds: null }, presentation: ReviewPresentation = { mode: 'flip' }) => {
    if (!client || visit.pending) return
    await run(async () => {
      visit.scope = scope
      visit.presentation = presentation
      visit.presentationVersion++
      update({ open: true, session: null, presentation, presentationVersion: visit.presentationVersion })
      const session = await client.startSession(scope)
      if (!accept(session)) return
      trackEvent('memnova_study_started', { scoped: scope.pageIds === null ? 0 : 1, cards: session.initialCount, mode: presentation.mode })
      if (visit.needsRefresh) await refreshCommitted()
    })
  }, [client, visit, run, update, accept, refreshCommitted])
  const reload = useCallback(async () => {
    if (!client) return
    if (!current.session) { await start(visit.scope, visit.presentation); return }
    const id = current.session.id
    await run(async () => {
      const session = await client.getSession(id)
      if (!accept(session)) return
      // Explicit reload reconciles an uncertain write against durable state.
      const pending = visit.pending
      if (pending && session.lastReviewId === pending.reviewId && typeof visit.pendingScore === 'boolean') {
        visit.scores.set(pending.reviewId, visit.pendingScore)
        update({ accuracy: studyAccuracy(visit.scores) })
      }
      visit.pending = null
      visit.pendingScore = undefined
      if (pending || visit.needsRefresh) await refreshCommitted()
    })
  }, [client, current.session, start, visit, run, accept, refreshCommitted, update])
  const rate = useCallback(async (rating: FSRSRating, correct?: boolean) => {
    const session = current.session
    const item = session?.current
    const page = item?.page
    if (!client || !session || (!visit.pending && (!item || !page || item.sourceError))) return
    await run(async () => {
      if (!visit.pending) {
        if (!item || !page) return
        const now = new Date()
        visit.pendingScore = correct
        visit.pending = { reviewId: crypto.randomUUID(), sessionId: session.id, sessionRevision: session.revision, cardId: item.card.id, cardRevision: item.card.revision, sourceFingerprint: page.fingerprint, ...(item.answerPage ? { answerFingerprint: item.answerPage.fingerprint } : {}), rating, durationMs: Math.min(86_400_000, Math.max(0, now.getTime() - visit.started)), reviewedAt: now.getTime(), schedule: scheduleReview(item.card.schedule, rating, now) }
      }
      const request = visit.pending
      const result = await client.rateCard(request)
      if (!accept(result.session)) return
      visit.pending = null
      if (typeof visit.pendingScore === 'boolean') {
        visit.scores.set(request.reviewId, visit.pendingScore)
        update({ accuracy: studyAccuracy(visit.scores) })
      }
      visit.pendingScore = undefined
      if (!result.replayed) {
        trackEvent('memnova_review_saved', { rating: request.rating, engine: 'ts-fsrs@5.4.2' })
        if (result.session.status === 'completed') {
          trackEvent('memnova_study_completed', { mode: visit.presentation.mode, cards: result.session.completedCount })
        }
      }
      await refreshCommitted()
    })
  }, [client, current.session, visit, run, accept, refreshCommitted, update])
  const undo = useCallback(async () => {
    const session = current.session
    if (!client || !session?.lastReviewId || visit.pending) return
    const reviewId = session.lastReviewId
    await run(async () => {
      visit.needsRefresh = true
      const result = await client.undoReview(session.id, reviewId, session.revision)
      if (!accept(result)) return
      visit.scores.delete(reviewId)
      update({ accuracy: studyAccuracy(visit.scores) })
      trackEvent('memnova_review_undone')
      await refreshCommitted()
    })
  }, [client, current.session, visit, run, accept, refreshCommitted, update])
  const close = useCallback(async () => {
    if (!client || visit.pending) return
    await run(async () => {
      if (current.session?.status === 'active') await client.pauseSession(current.session.id, current.session.revision)
      update({ open: false })
    })
  }, [client, current.session, visit, run, update])
  const skip = useCallback(async () => {
    if (!client || !current.session || visit.pending) return
    const session = current.session
    await run(async () => { accept(await client.skipSessionCard(session.id, session.revision)) })
  }, [client, current.session, visit, run, accept])
  return { libraryKey, presentation: current.presentation, presentationVersion: current.presentationVersion, accuracy: current.accuracy, open: current.open, busy: current.busy, session: current.session, error: current.error, start, reload, rate, undo, close, skip, retry: () => visit.pending ? rate(visit.pending.rating) : reload(), hasPending: visit.pending !== null }
}
