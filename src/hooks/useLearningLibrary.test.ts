import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LearningClient } from '../lib/learning/client'
import { useLearningLibrary } from './useLearningLibrary'
vi.mock('../lib/learning/client', () => ({ LearningClient: { connect: vi.fn(), previewMigration: vi.fn() } }))
vi.mock('../lib/telemetry', () => ({ trackEvent: vi.fn() }))
describe('learning library isolation', () => {
  it('ignores a retained refresh callback after switching libraries', async () => {
    const client = (id: string) => ({ libraryId: id, migrationStatus: vi.fn().mockResolvedValue({ state: 'ready' }), syncPages: vi.fn().mockResolvedValue([]), listCards: vi.fn().mockResolvedValue([]), studyStats: vi.fn().mockResolvedValue({ totalXp: id === 'a' ? 10 : 20 }) })
    const first = client('a'), second = client('b')
    vi.mocked(LearningClient.connect).mockResolvedValueOnce(first as unknown as LearningClient).mockResolvedValueOnce(second as unknown as LearningClient)
    const { result, rerender } = renderHook(({ root }) => useLearningLibrary(root), { initialProps: { root: '/a' } })
    await waitFor(() => expect(result.current.phase).toBe('ready'))
    const oldRefresh = result.current.refresh
    rerender({ root: '/b' })
    await waitFor(() => expect(result.current.client?.libraryId).toBe('b'))
    await act(() => oldRefresh())
    expect(result.current.phase).toBe('ready')
    expect(result.current.client?.libraryId).toBe('b')
    expect(result.current.stats?.totalXp).toBe(20)
  })
})

it('does not let an older refresh replace a newer committed card list', async () => {
  let resolveOld: (value: unknown[]) => void = () => {}
  const oldCards = new Promise<unknown[]>(resolve => { resolveOld = resolve })
  const listCards = vi.fn().mockResolvedValue([])
  const client = { libraryId: 'same', migrationStatus: vi.fn().mockResolvedValue({ state: 'ready' }), syncPages: vi.fn().mockResolvedValue([]), listCards, studyStats: vi.fn().mockResolvedValue({ totalXp: 0 }) }
  vi.mocked(LearningClient.connect).mockResolvedValue(client as unknown as LearningClient)
  const { result } = renderHook(() => useLearningLibrary('/same'))
  await waitFor(() => expect(result.current.stats?.totalXp).toBe(0))
  listCards.mockImplementationOnce(() => oldCards).mockResolvedValue([{ id: 'committed-card' }])
  let older: Promise<void> = Promise.resolve()
  act(() => { older = result.current.refresh() })
  await waitFor(() => expect(listCards).toHaveBeenCalledTimes(2))
  await act(() => result.current.refresh())
  expect(result.current.cards.map(card => card.id)).toEqual(['committed-card'])
  await act(async () => { resolveOld([]); await older })
  expect(result.current.cards.map(card => card.id)).toEqual(['committed-card'])
})

it('discards migration previews that finish after switching libraries', async () => {
  let resolvePreview: (value: unknown) => void = () => {}
  const delayed = new Promise<unknown>(resolve => { resolvePreview = resolve })
  const client = { migrationStatus: vi.fn().mockResolvedValue({ state: 'legacy' }) }
  vi.mocked(LearningClient.connect).mockResolvedValue(client as unknown as LearningClient)
  vi.mocked(LearningClient.previewMigration).mockReturnValue(delayed as ReturnType<typeof LearningClient.previewMigration>)
  const { result, rerender } = renderHook(({ root }) => useLearningLibrary(root), { initialProps: { root: '/first' } })
  await waitFor(() => expect(result.current.phase).toBe('legacy'))
  let previewing: Promise<void> = Promise.resolve()
  act(() => { previewing = result.current.openMigration() })
  rerender({ root: '/second' })
  await waitFor(() => expect(result.current.root).toBe('/second'))
  await act(async () => { resolvePreview({ fingerprint: 'first-library' }); await previewing })
  expect(result.current.preview).toBeNull()
  expect(result.current.migrationOpen).toBe(false)
})

it('can reopen migration after returning to a library whose preview was interrupted', async () => {
  let finish: (value: unknown) => void = () => {}
  const delayed = new Promise<unknown>(resolve => { finish = resolve })
  const client = { migrationStatus: vi.fn().mockResolvedValue({ state: 'legacy' }) }
  vi.mocked(LearningClient.connect).mockResolvedValue(client as unknown as LearningClient)
  vi.mocked(LearningClient.previewMigration).mockReturnValueOnce(delayed as ReturnType<typeof LearningClient.previewMigration>).mockResolvedValue({ fingerprint: 'fresh' } as Awaited<ReturnType<typeof LearningClient.previewMigration>>)
  const { result, rerender } = renderHook(({ root }) => useLearningLibrary(root), { initialProps: { root: '/interrupted' } })
  await waitFor(() => expect(result.current.phase).toBe('legacy'))
  let pending: Promise<void> = Promise.resolve()
  act(() => { pending = result.current.openMigration() })
  rerender({ root: '/other' }); await waitFor(() => expect(result.current.phase).toBe('legacy'))
  rerender({ root: '/interrupted' }); await waitFor(() => expect(result.current.phase).toBe('legacy'))
  await act(async () => { finish({ fingerprint: 'stale' }); await pending })
  expect(result.current.busy).toBe(false)
  await act(() => result.current.openMigration())
  expect(result.current.preview?.fingerprint).toBe('fresh')
})

it('does not publish a failed background read into a different library', async () => {
  let fail: (reason: Error) => void = () => {}
  const delayed = new Promise<never>((_resolve, reject) => { fail = reject })
  const client = (id: string) => ({ libraryId: id, migrationStatus: vi.fn().mockResolvedValue({state:'ready'}), syncPages: vi.fn().mockResolvedValue([]), listCards: vi.fn().mockResolvedValue([]), studyStats: vi.fn().mockResolvedValue({totalXp:0}) })
  const a=client('a'), b=client('b')
  vi.mocked(LearningClient.connect).mockResolvedValueOnce(a as unknown as LearningClient).mockResolvedValueOnce(b as unknown as LearningClient)
  const interval=vi.spyOn(globalThis,'setInterval')
  try {
    const {result,rerender}=renderHook(({root})=>useLearningLibrary(root),{initialProps:{root:'/a'}})
    await waitFor(()=>expect(result.current.phase).toBe('ready'))
    const callback=interval.mock.calls.find(call=>call[1]===60_000)?.[0] as (()=>void)
    a.listCards.mockReturnValueOnce(delayed)
    act(()=>callback())
    await waitFor(()=>expect(a.listCards).toHaveBeenCalledTimes(2))
    rerender({root:'/b'})
    await waitFor(()=>expect(result.current.client?.libraryId).toBe('b'))
    await act(async()=>{fail(new Error('old library unavailable'));await Promise.resolve()})
    expect(result.current.error).toBeNull()
  } finally { interval.mockRestore() }
})
