import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useLearningStudy } from './useLearningStudy'
import type { LearningClient } from '../lib/learning/client'
import type { StudySession } from '../lib/learning/types'
vi.mock('../lib/telemetry', () => ({ trackEvent: vi.fn() }))
const session: StudySession = { id: 'session', scope: { pageIds: null }, initialCount: 1, currentIndex: 0, status: 'active', revision: 0, updatedAt: 0, waitingUntil: null, completedCount: 0, reviewCount: 0, correctCount: 0, lastReviewId: null, canUndo: false, current: { card: { id: 'card', pageId: 'page', front: 'Question', back: 'Answer', status: 'active', answerMode: 'inline', position: 0, properties: {}, revision: 0, createdAt: 0, updatedAt: 0, schedule: { state: 'new', due: '2020-01-01T00:00:00Z', stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, lastReview: null, learningSteps: 0, engine: 'legacy-fsrs5', revision: 0 } }, page: { id: 'page', path: 'lesson.md', title: 'Lesson', content: 'Lesson', fingerprint: 'original-source' }, sourceError: null } }
it('retry after a committed rating retries the failed dashboard refresh', async () => {
 const completed = { ...session, current: null, status: 'completed' as const, reviewCount: 1, revision: 1 }
 const refresh = vi.fn().mockRejectedValueOnce(new Error('Read failed')).mockResolvedValue(undefined)
 const client = { vaultPath: '/a', libraryId: 'a', startSession: vi.fn().mockResolvedValue(session), rateCard: vi.fn().mockResolvedValue({session: completed, replayed: false}), getSession: vi.fn().mockResolvedValue(completed) } as unknown as LearningClient
 const { result } = renderHook(() => useLearningStudy(client, refresh))
 await act(() => result.current.start())
 await act(() => result.current.rate(3))
 expect(result.current.error).toContain('Read failed')
 await act(() => result.current.retry())
 expect(client.rateCard).toHaveBeenCalledTimes(1)
 expect(refresh).toHaveBeenCalledTimes(2)
})
it('late close from Library A must not close the newly opened Library B session', async () => {
 let finish: () => void = () => {}
 const pausing = new Promise<void>(resolve => { finish = resolve })
 const a = { vaultPath: '/a', libraryId: 'a', startSession: vi.fn().mockResolvedValue(session), pauseSession: vi.fn().mockReturnValue(pausing) } as unknown as LearningClient
 const b = { vaultPath: '/b', libraryId: 'b', startSession: vi.fn().mockResolvedValue({...session,id:'session-b'}) } as unknown as LearningClient
 const { result, rerender } = renderHook(({ client }) => useLearningStudy(client, async () => {}), {initialProps: {client:a}})
 await act(() => result.current.start())
 let closing: Promise<void> = Promise.resolve()
 await act(async () => { closing = result.current.close(); await Promise.resolve() })
 rerender({client:b})
 await act(() => result.current.start())
 expect(result.current.open).toBe(true)
 await act(async () => { finish(); await closing })
 expect(result.current.session?.id).toBe('session-b')
 expect(result.current.open).toBe(true)
})

it('locks grading while pausing and ignores an older start after switching away and back', async () => {
 let finishStart: (value: StudySession) => void = () => {}
 const starting = new Promise<StudySession>(resolve => { finishStart = resolve })
 let finishPause: () => void = () => {}
 const pausing = new Promise<void>(resolve => { finishPause = resolve })
 const a = { vaultPath: '/a', libraryId: 'a', startSession: vi.fn().mockReturnValueOnce(starting).mockResolvedValue({...session,id:'fresh-a'}), pauseSession: vi.fn().mockReturnValue(pausing), rateCard: vi.fn() } as unknown as LearningClient
 const b = { vaultPath: '/b', libraryId: 'b', startSession: vi.fn().mockResolvedValue({...session,id:'b'}) } as unknown as LearningClient
 const {result,rerender}=renderHook(({client})=>useLearningStudy(client,async()=>{}),{initialProps:{client:a}})
 let oldStart: Promise<void> = Promise.resolve()
 await act(async()=>{oldStart=result.current.start();await Promise.resolve()})
 rerender({client:b});await act(()=>result.current.start())
 expect(result.current.session?.id).toBe('b')
 rerender({client:a});await act(()=>result.current.start())
 await act(async()=>{finishStart(session);await oldStart})
 expect(result.current.session?.id).toBe('fresh-a')
 let closing: Promise<void> = Promise.resolve()
 await act(async()=>{closing=result.current.close();await Promise.resolve()})
 expect(result.current.busy).toBe(true)
 await act(()=>result.current.rate(3))
 expect(a.rateCard).not.toHaveBeenCalled()
 await act(async()=>{finishPause();await closing})
 expect(result.current.open).toBe(false)
})

it('reconciles statistics after an undo response is lost', async () => {
 const before = {...session,lastReviewId:'review',canUndo:true}
 const refreshed = {...session,revision:2,lastReviewId:null,canUndo:false}
 const client = {vaultPath:'/a',libraryId:'a',startSession:vi.fn().mockResolvedValue(before),undoReview:vi.fn().mockRejectedValue(new Error('Response lost')),getSession:vi.fn().mockResolvedValue(refreshed)} as unknown as LearningClient
 const committed=vi.fn().mockResolvedValue(undefined)
 const {result}=renderHook(()=>useLearningStudy(client,committed))
 await act(()=>result.current.start())
 await act(()=>result.current.undo())
 await act(()=>result.current.retry())
 expect(client.undoReview).toHaveBeenCalledTimes(1)
 expect(result.current.session?.revision).toBe(2)
 expect(committed).toHaveBeenCalledTimes(1)
})

it('binds linked-answer ratings to the displayed source and retains that fingerprint for retry', async () => {
 const linked=structuredClone(session)
 if (!linked.current?.page) throw new Error('Missing fixture page')
 linked.current.card.answerMode='page';linked.current.card.answerPageId='external'
 linked.current.answerPage={...linked.current.page,id:'external',path:'source.md',fingerprint:'external-fingerprint'}
 const complete={...linked,current:null,status:'completed' as const,reviewCount:1}
 const rateCard=vi.fn().mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({session:complete,replayed:true})
 const client={vaultPath:'/qa',libraryId:'qa',startSession:vi.fn().mockResolvedValue(linked),rateCard} as unknown as LearningClient
 const {result}=renderHook(()=>useLearningStudy(client,async()=>{}))
 await act(()=>result.current.start())
 await act(()=>result.current.rate(3))
 expect(rateCard.mock.calls[0][0]).toMatchObject({sourceFingerprint:'original-source',answerFingerprint:'external-fingerprint'})
 linked.current.answerPage.fingerprint='changed-after-request'
 await act(()=>result.current.retry())
 expect(rateCard.mock.calls[1][0]).toEqual(rateCard.mock.calls[0][0])
})
