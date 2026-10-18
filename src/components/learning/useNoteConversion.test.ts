import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { noteMemoryFlowFixture, memoryPageId } from '../../test-utils/noteMemoryFlowFixture'
import { useNoteConversion } from './useNoteConversion'
vi.mock('../../lib/telemetry', () => ({ trackEvent: vi.fn() }))
const draft = { front: { kind: 'markdown' as const }, back: { kind: 'inline' as const, source: { kind: 'markdown' as const } }, memory: { kind: 'fresh' as const } }
it('does not choose a learning goal or mutate while only previewing', async () => {
  const { client } = noteMemoryFlowFixture(), flush = vi.fn(), onUpdated = vi.fn()
  const { result, unmount } = renderHook(() => useNoteConversion({ client, open: true, flush, onUpdated }))
  await waitFor(() => expect(result.current.preview).not.toBeNull())
  expect(result.current.canApply).toBe(false)
  expect(client.applyNoteConversion).not.toHaveBeenCalled(); expect(flush).not.toHaveBeenCalled()
  unmount()
})
it('retries the same immutable operation after an uncertain response', async () => {
  const { client } = noteMemoryFlowFixture(); client.applyNoteConversion.mockRejectedValueOnce(Error('response lost'))
  const { result } = renderHook(() => useNoteConversion({ client, open: true, flush: vi.fn(), onUpdated: vi.fn() }))
  await waitFor(() => expect(result.current.preview).not.toBeNull())
  act(() => { result.current.selectPage(memoryPageId); result.current.setDraft(draft) })
  await act(async () => { await result.current.apply() })
  await act(async () => { await result.current.apply() })
  expect(client.applyNoteConversion).toHaveBeenCalledTimes(2)
  expect(client.applyNoteConversion.mock.calls[0]).toEqual(client.applyNoteConversion.mock.calls[1])
})
it('retries only refresh after conversion already committed', async () => {
  const { client } = noteMemoryFlowFixture(), onUpdated = vi.fn().mockRejectedValueOnce(Error('refresh failed')).mockResolvedValue(undefined)
  const { result } = renderHook(() => useNoteConversion({ client, open: true, flush: vi.fn(), onUpdated }))
  await waitFor(() => expect(result.current.preview).not.toBeNull())
  act(() => { result.current.selectPage(memoryPageId); result.current.setDraft(draft) })
  await act(async () => { await result.current.apply() })
  expect(result.current.refreshPending).toBe(true)
  await act(async () => { await result.current.apply() })
  expect(client.applyNoteConversion).toHaveBeenCalledTimes(1); expect(onUpdated).toHaveBeenCalledTimes(2)
})
it('ignores late conversion completion after switching Library visits', async () => {
  const first = noteMemoryFlowFixture(), second = noteMemoryFlowFixture(), onUpdated = vi.fn()
  let finish: (value: typeof first.result) => void = () => {}
  first.client.applyNoteConversion.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  const { result, rerender } = renderHook(({ client }) => useNoteConversion({ client, open: true, flush: vi.fn(), onUpdated }), { initialProps: { client: first.client } })
  await waitFor(() => expect(result.current.preview).not.toBeNull())
  act(() => { result.current.selectPage(memoryPageId); result.current.setDraft(draft) })
  let running: Promise<void> = Promise.resolve()
  act(() => { running = result.current.apply() })
  await waitFor(() => expect(first.client.applyNoteConversion).toHaveBeenCalledTimes(1))
  rerender({ client: second.client })
  await act(async () => { finish(first.result); await running })
  expect(onUpdated).not.toHaveBeenCalled(); expect(result.current.result).toBeNull()
})
