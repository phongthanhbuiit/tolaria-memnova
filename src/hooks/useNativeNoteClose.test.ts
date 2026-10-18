import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNativeNoteClose } from './useNativeNoteClose'
import { registerNoteCloseFlush } from '../lib/noteCloseFlush'

const { invoke, listen, native } = vi.hoisted(() => ({ invoke: vi.fn(), listen: vi.fn(), native: vi.fn(() => true) }))
vi.mock('@tauri-apps/api/core', () => ({ invoke }))
vi.mock('@tauri-apps/api/event', () => ({ listen }))
vi.mock('../mock-tauri', () => ({ isTauri: native }))
let unregister = () => {}
beforeEach(() => {
  vi.clearAllMocks()
  native.mockReturnValue(true)
  invoke.mockResolvedValue(null)
  listen.mockResolvedValue(vi.fn())
})
afterEach(() => unregister())

describe('native note close bridge', () => {
  it('replays an early close after subscribing, using the canonical registered note writer', async () => {
    const request = { token: 'startup', target: 'app' }
    invoke.mockImplementation(async command => command === 'pending_note_close' ? request : undefined)
    const flush = vi.fn().mockResolvedValue(undefined)
    unregister = registerNoteCloseFlush(flush)
    const { result, unmount } = renderHook(() => useNativeNoteClose())
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('acknowledge_note_close', { acknowledgement: { token: 'startup', saved: true } }))
    expect(listen).toHaveBeenCalledWith('note-close-requested', expect.any(Function))
    expect(listen).toHaveBeenCalledWith('note-close-cancelled', expect.any(Function))
    expect(flush).toHaveBeenCalledOnce()
    expect(result.current.status.kind).toBe('saving')
    unmount()
  })
  it('unsubscribes listeners which finish registering after unmount without replaying a close', async () => {
    let resolve!: (unlisten: () => void) => void
    listen.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    const { unmount } = renderHook(() => useNativeNoteClose())
    unmount()
    const unlisten = vi.fn()
    await act(async () => { resolve(unlisten) })
    await waitFor(() => expect(unlisten).toHaveBeenCalledOnce())
    expect(invoke).not.toHaveBeenCalled()
  })
  it('does not connect native listeners in the browser', () => {
    native.mockReturnValue(false)
    const { result } = renderHook(() => useNativeNoteClose())
    expect(result.current.status.kind).toBe('idle')
    expect(invoke).not.toHaveBeenCalled()
    expect(listen).not.toHaveBeenCalled()
  })
})
