import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { LearningClient } from '../lib/learning/client'
import { useLearningLibrary } from './useLearningLibrary'

vi.mock('../lib/learning/client', () => ({
  LearningClient: { connect: vi.fn() },
}))
vi.mock('../lib/telemetry', () => ({ trackEvent: vi.fn() }))

function client(id: string) {
  return {
    libraryId: id,
    supportsNoteMemory: true,
    migrationStatus: vi.fn().mockResolvedValue({ state: 'ready' }),
    syncPages: vi.fn().mockResolvedValue([]),
    syncNoteWorkspace: vi.fn().mockResolvedValue({ pages: [], notes: [] }),
    listCards: vi.fn().mockResolvedValue([{ id: `old-${id}` }]),
    studyStats: vi.fn().mockResolvedValue({ totalXp: 0 }),
  }
}

it('loads live note summaries through the packaged workspace API and keeps old cards separate', async () => {
  const api = client('a')
  const notes = [
    { view: { pageId: 'note-a', state: 'ready' }, card: { id: 'bound-a' } },
  ]
  api.syncNoteWorkspace.mockResolvedValue({ pages: [], notes })
  vi.mocked(LearningClient.connect).mockResolvedValue(
    api as unknown as LearningClient
  )
  const { result } = renderHook(() => useLearningLibrary('/a'))
  await waitFor(() => expect(result.current.phase).toBe('ready'))
  expect(api.syncNoteWorkspace).toHaveBeenCalledOnce()
  expect(api.syncPages).not.toHaveBeenCalled()
  expect(result.current.notes).toEqual(notes)
  expect(result.current.cards.map((card) => card.id)).toEqual(['old-a'])
})

it('does not publish late workspace summaries into another Library', async () => {
  const a = client('a'),
    b = client('b')
  let finish: (value: { pages: []; notes: [] }) => void = () => {}
  a.syncNoteWorkspace.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  vi.mocked(LearningClient.connect)
    .mockResolvedValueOnce(a as unknown as LearningClient)
    .mockResolvedValueOnce(b as unknown as LearningClient)
  const { result, rerender } = renderHook(
    ({ root }) => useLearningLibrary(root),
    { initialProps: { root: '/a' } }
  )
  await waitFor(() => expect(a.syncNoteWorkspace).toHaveBeenCalledOnce())
  rerender({ root: '/b' })
  await waitFor(() => expect(result.current.phase).toBe('ready'))
  await act(async () => {
    finish({ pages: [], notes: [] })
    await Promise.resolve()
  })
  expect(result.current.client?.libraryId).toBe('b')
  expect(result.current.notes).toEqual([])
  expect(result.current.cards.map((card) => card.id)).toEqual(['old-b'])
})
