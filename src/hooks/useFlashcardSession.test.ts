import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFlashcardSession } from './useFlashcardSession'
import { makeEntry } from '../test-utils/noteListTestUtils'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }))

describe('legacy flashcard session data safety', () => {
  afterEach(() => vi.useRealTimers())

  it('does not reset an existing schedule when enabling review again', async () => {
    const entry = makeEntry({ fsrsEnabled: true, fsrsState: 'review', fsrsReps: 34, fsrsDue: '2099-01-01T00:00:00Z' })
    const save = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useFlashcardSession({ entries: [entry], onPersistSchedule: save }))
    await act(() => result.current.scheduleForReview(entry))
    expect(save).not.toHaveBeenCalled()
    expect(result.current.dueEntries).toEqual([])
  })

  it('uses dedicated scheduling fields for a newly enabled note', async () => {
    const entry = makeEntry()
    const save = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useFlashcardSession({ entries: [entry], onPersistSchedule: save }))
    await act(() => result.current.scheduleForReview(entry))
    expect(result.current.dueEntries[0]).toMatchObject({ fsrsEnabled: true, fsrsState: 'new', fsrsReps: 0 })
    expect(result.current.dueEntries[0]?.properties).not.toHaveProperty('_fsrs_state')
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('does not award stats if the atomic schedule save fails', async () => {
    const entry = makeEntry({ fsrsEnabled: true })
    const save = vi.fn().mockRejectedValue(new Error('Disk full'))
    const stats = vi.fn()
    const { result } = renderHook(() => useFlashcardSession({ entries: [entry], onPersistSchedule: save, onRecordReview: stats }))
    await expect(result.current.handleRate(entry, 3)).rejects.toThrow('Disk full')
    expect(stats).not.toHaveBeenCalled()
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('includes an enabled deck root but never falls back to unrelated cards', () => {
    const root = makeEntry({ path: '/root.md', title: 'Root', fsrsEnabled: true })
    const other = makeEntry({ path: '/other.md', title: 'Other', fsrsEnabled: true })
    const { result } = renderHook(() => useFlashcardSession({ entries: [root, other], onPersistSchedule: vi.fn() }))
    act(() => result.current.startSession(root))
    expect(result.current.dueEntries.map(e => e.path)).toEqual(['/root.md'])
  })

  it('refreshes due counts when a learning card becomes due without an index reload', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'))
    const entry = makeEntry({ fsrsEnabled: true, fsrsState: 'learning', fsrsDue: '2026-10-17T12:01:00Z' })
    const { result } = renderHook(() => useFlashcardSession({ entries: [entry], onPersistSchedule: vi.fn() }))
    expect(result.current.reviewCount).toBe(0)
    act(() => vi.advanceTimersByTime(60_000))
    expect(result.current.reviewCount).toBe(1)
  })

  it('does not rerender the whole app every second while waiting for the next due card', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'))
    const entries = [makeEntry({ fsrsEnabled: true, fsrsState: 'learning', fsrsDue: '2026-10-17T12:01:00Z' })]
    const observe = vi.fn()
    renderHook(() => {
      const session = useFlashcardSession({ entries, onPersistSchedule: vi.fn() })
      observe(session.reviewCount)
      return session
    })
    const initialRenders = observe.mock.calls.length
    for (let second = 0; second < 30; second++) {
      act(() => vi.advanceTimersByTime(1000))
    }
    expect(observe).toHaveBeenCalledTimes(initialRenders)
  })
})
