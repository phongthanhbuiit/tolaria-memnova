import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushRegisteredNoteChanges, registerNoteCloseFlush } from './noteCloseFlush'

let unregister = () => {}
afterEach(() => unregister())
describe('note close flush ownership', () => {
  it('awaits the current editor writer, without inventing a second persistence path', async () => {
    let resolve!: () => void
    const pending = new Promise<void>(r => { resolve = r })
    unregister = registerNoteCloseFlush(() => pending)
    const done = vi.fn()
    const close = flushRegisteredNoteChanges().then(done)
    await Promise.resolve()
    expect(done).not.toHaveBeenCalled()
    resolve()
    await close
    expect(done).toHaveBeenCalledOnce()
  })
  it('rejects a failed save and retains the current writer for retry', async () => {
    const flush = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined)
    unregister = registerNoteCloseFlush(flush)
    await expect(flushRegisteredNoteChanges()).rejects.toThrow('disk full')
    await flushRegisteredNoteChanges()
    expect(flush).toHaveBeenCalledTimes(2)
  })
  it('rejects a Library change while the old save is in flight', async () => {
    let resolve!: () => void
    unregister = registerNoteCloseFlush(() => new Promise<void>(r => { resolve = r }))
    const close = flushRegisteredNoteChanges()
    unregister()
    unregister = registerNoteCloseFlush(async () => {})
    resolve()
    await expect(close).rejects.toThrow('context')
  })
  it('stale cleanup cannot unregister the new Library; non-editor windows can close', async () => {
    const old = registerNoteCloseFlush(async () => {})
    const flush = vi.fn().mockResolvedValue(undefined)
    unregister = registerNoteCloseFlush(flush)
    old()
    await flushRegisteredNoteChanges()
    expect(flush).toHaveBeenCalledOnce()
    unregister()
    await expect(flushRegisteredNoteChanges()).resolves.toBeUndefined()
  })
})
