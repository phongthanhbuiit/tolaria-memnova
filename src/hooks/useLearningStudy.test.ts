import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useLearningStudy } from './useLearningStudy'
import type { LearningClient } from '../lib/learning/client'
import type { StudySession } from '../lib/learning/types'
vi.mock('../lib/telemetry', () => ({ trackEvent: vi.fn() }))
it('retains the exact review request after an uncertain save and records progress only after commit', async () => {
  const session: StudySession = { id: 'session', scope: { pageIds: null }, initialCount: 1, currentIndex: 0, status: 'active', revision: 0, updatedAt: 0, waitingUntil: null, completedCount: 0, reviewCount: 0, correctCount: 0, lastReviewId: null, canUndo: false, current: { card: { id: 'card', pageId: 'page', front: 'Question', back: 'Answer', status: 'active', answerMode: 'inline', position: 0, properties: {}, revision: 0, createdAt: 0, updatedAt: 0, schedule: { state: 'new', due: '2020-01-01T00:00:00Z', stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, lastReview: null, learningSteps: 0, engine: 'legacy-fsrs5', revision: 0 } }, page: { id: 'page', path: 'lesson.md', title: 'Lesson', content: 'Lesson', fingerprint: 'original-source' }, sourceError: null } }
  const completed = { ...session, current: null, status: 'completed' as const, reviewCount: 1, revision: 1 }
  const save = vi.fn().mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({ session: completed, earnedXp: 5, replayed: true })
  const close = vi.fn()
  const client = { startSession: vi.fn().mockResolvedValue(session), rateCard: save, pauseSession: close } as unknown as LearningClient
  const committed = vi.fn().mockResolvedValue(undefined)
  const { result } = renderHook(() => useLearningStudy(client, committed))
  await act(() => result.current.start())
  await act(() => result.current.rate(3))
  expect(result.current.session?.reviewCount).toBe(0)
  expect(committed).not.toHaveBeenCalled()
  await act(() => result.current.close())
  expect(result.current.open).toBe(true)
  expect(close).not.toHaveBeenCalled()
  await act(() => result.current.retry())
  expect(save.mock.calls[1][0]).toEqual(save.mock.calls[0][0])
  expect(result.current.session?.reviewCount).toBe(1)
  expect(committed).toHaveBeenCalledTimes(1)
})

it('keeps controls busy while committed dashboard data is still refreshing', async () => {
  let release: () => void = () => {}
  const refreshing = new Promise<void>(resolve => { release = resolve })
  const session = { id: 'session', status: 'active', revision: 0, scope: { pageIds: null }, current: { card: { id: 'card', revision: 0, schedule: { state: 'new', due: '2020-01-01T00:00:00Z', stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, learningSteps: 0, lastReview: null, engine: 'legacy-fsrs5', revision: 0 } }, page: { fingerprint: 'source' } } } as StudySession
  const client = { startSession: vi.fn().mockResolvedValue(session), rateCard: vi.fn().mockResolvedValue({ session: { ...session, current: null, revision: 1, lastReviewId: 'review', canUndo: true } }), undoReview: vi.fn() } as unknown as LearningClient
  const { result } = renderHook(() => useLearningStudy(client, () => refreshing))
  await act(() => result.current.start())
  let rating: Promise<void> = Promise.resolve()
  await act(async () => { rating = result.current.rate(4); await Promise.resolve() })
  expect(result.current.busy).toBe(true)
  await act(async () => { release(); await rating })
  expect(result.current.busy).toBe(false)
})
