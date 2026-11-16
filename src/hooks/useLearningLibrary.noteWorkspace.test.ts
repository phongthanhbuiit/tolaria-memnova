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

it('publishes a failed manual refresh once and clears it after a successful background snapshot', async () => {
  const api = client('refresh')
  vi.mocked(LearningClient.connect).mockResolvedValue(api as unknown as LearningClient)
  const { result } = renderHook(() => useLearningLibrary('/refresh'))
  await waitFor(() => expect(result.current.phase).toBe('ready'))
  api.syncNoteWorkspace.mockRejectedValueOnce(Error('temporary-read-failure'))
  await act(async () => { await expect(result.current.refresh()).rejects.toThrow('temporary-read-failure') })
  expect(result.current.error).toContain('temporary-read-failure')
  await act(() => result.current.refresh())
  expect(result.current.error).toBeNull()
})

it.each(['complete', 'fail'])('returns the newest same-library snapshot to Study when the superseded read can %s', async outcome => {
  const api = client('study')
  vi.mocked(LearningClient.connect).mockResolvedValue(api as unknown as LearningClient)
  const { result } = renderHook(() => useLearningLibrary('/study'))
  await waitFor(() => expect(result.current.phase).toBe('ready'))
  let finish!: () => void
  api.syncNoteWorkspace.mockReturnValueOnce(new Promise((resolve, reject) => {
    finish = () => outcome === 'complete' ? resolve({ pages: [], notes: [] }) : reject(Error('old read failed'))
  }))
  const study = result.current.refreshSnapshot()
  api.syncNoteWorkspace.mockResolvedValueOnce({ pages: [{ id: 'fresh' }], notes: [] })
  await act(() => result.current.refresh())
  await act(async () => {
    finish()
    expect((await study)?.pages.map(page => page.id)).toEqual(['fresh'])
  })
})

it('discards a study snapshot if its client reconnects before the read finishes', async () => {
  const old = client('old'), restored = client('restored')
  vi.mocked(LearningClient.connect)
    .mockResolvedValueOnce(old as unknown as LearningClient)
    .mockResolvedValueOnce(restored as unknown as LearningClient)
  const { result } = renderHook(() => useLearningLibrary('/study'))
  await waitFor(() => expect(result.current.phase).toBe('ready'))
  let finish!: () => void
  old.syncNoteWorkspace.mockReturnValueOnce(new Promise(resolve => {
    finish = () => resolve({ pages: [{ id: 'old' }], notes: [] })
  }))
  const study = result.current.refreshSnapshot()
  await act(() => result.current.reconnect())
  await act(async () => {
    finish()
    await expect(study).resolves.toBeUndefined()
  })
})

it('does not let an older failed refresh replace a newer successful snapshot', async () => {
  const api = client('refresh')
  vi.mocked(LearningClient.connect).mockResolvedValue(api as unknown as LearningClient)
  const { result } = renderHook(() => useLearningLibrary('/refresh'))
  await waitFor(() => expect(result.current.phase).toBe('ready'))
  let rejectOld: (reason: Error) => void = () => {}
  api.syncNoteWorkspace.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectOld = reject }))
  let older: Promise<unknown> = Promise.resolve()
  act(() => { older = result.current.refresh().catch(() => {}) })
  await act(() => result.current.refresh())
  await act(async () => { rejectOld(Error('outdated failure')); await older })
  expect(result.current.error).toBeNull()
  expect(result.current.phase).toBe('ready')
})

it('ignores a refresh callback retained across reconnecting the same filesystem root', async () => {
  const first = client('old-store'), second = client('restored-store')
  vi.mocked(LearningClient.connect).mockResolvedValueOnce(first as unknown as LearningClient).mockResolvedValueOnce(second as unknown as LearningClient)
  const { result } = renderHook(() => useLearningLibrary('/same-root'))
  await waitFor(() => expect(result.current.client?.libraryId).toBe('old-store'))
  const retained = result.current.refresh
  await act(() => result.current.reconnect())
  expect(result.current.client?.libraryId).toBe('restored-store')
  first.syncNoteWorkspace.mockRejectedValueOnce(Error('closed old store'))
  await act(async () => { await retained().catch(() => {}) })
  expect(result.current.error).toBeNull()
  expect(first.syncNoteWorkspace).toHaveBeenCalledOnce()
  expect(result.current.client?.libraryId).toBe('restored-store')
})
