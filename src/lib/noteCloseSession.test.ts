import { describe, expect, it, vi } from 'vitest'
import { createNoteCloseSession, type NoteCloseRequest } from './noteCloseSession'

function harness() {
  let pending: NoteCloseRequest | null = { token: 'one', target: 'app' }
  const flush = vi.fn().mockResolvedValue(undefined)
  const acknowledge = vi.fn().mockImplementation(async () => { pending = null })
  const status = vi.fn()
  const session = createNoteCloseSession({ pending: async () => pending, flush, acknowledge, status })
  return { ...session, flush, acknowledge, status, setPending: (p: NoteCloseRequest | null) => { pending = p } }
}
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(r => { resolve = r })
  return { promise, resolve }
}

describe('native note close session', () => {
  it('blocks input before flushing and acknowledges only after persistence finishes', async () => {
    const h = harness(), save = deferred()
    h.flush.mockImplementation(() => { expect(h.status).toHaveBeenCalledWith({ kind: 'saving', target: 'app' }); return save.promise })
    const work = h.request({ token: 'one', target: 'app' })
    await vi.waitFor(() => expect(h.flush).toHaveBeenCalledOnce())
    expect(h.acknowledge).not.toHaveBeenCalled()
    save.resolve()
    await work
    expect(h.acknowledge).toHaveBeenCalledWith('one', true)
  })
  it('deduplicates event/startup delivery and ignores stale events', async () => {
    const h = harness()
    await Promise.all([h.request({ token: 'one', target: 'app' }), h.request({ token: 'one', target: 'app' })])
    await h.request({ token: 'one', target: 'app' })
    expect(h.flush).toHaveBeenCalledOnce()
    expect(h.acknowledge).toHaveBeenCalledOnce()
  })
  it('keeps failure visible, rejects close, and uses a fresh save on retry', async () => {
    const h = harness()
    h.flush.mockRejectedValueOnce(new Error('disk full'))
    await h.request({ token: 'one', target: 'app' })
    expect(h.status).toHaveBeenLastCalledWith({ kind: 'failed', target: 'app' })
    expect(h.acknowledge).toHaveBeenCalledWith('one', false)
    h.setPending({ token: 'two', target: 'app' })
    await h.request({ token: 'two', target: 'app' })
    expect(h.flush).toHaveBeenCalledTimes(2)
    expect(h.acknowledge).toHaveBeenLastCalledWith('two', true)
  })
  it('serializes a retry behind timed-out work, without approving it using the old save', async () => {
    const h = harness(), old = deferred()
    h.flush.mockReturnValueOnce(old.promise)
    const first = h.request({ token: 'one', target: 'app' })
    await vi.waitFor(() => expect(h.flush).toHaveBeenCalledOnce())
    h.cancel({ token: 'one', target: 'app' })
    h.setPending({ token: 'two', target: 'window' })
    const second = h.request({ token: 'two', target: 'window' })
    await Promise.resolve()
    expect(h.flush).toHaveBeenCalledOnce()
    old.resolve()
    await Promise.all([first, second])
    expect(h.flush).toHaveBeenCalledTimes(2)
    expect(h.acknowledge).not.toHaveBeenCalledWith('one', true)
    expect(h.acknowledge).toHaveBeenLastCalledWith('two', true)
  })
  it('does not acknowledge or update UI after disposal', async () => {
    const h = harness(), save = deferred()
    h.flush.mockReturnValueOnce(save.promise)
    const work = h.request({ token: 'one', target: 'app' })
    await vi.waitFor(() => expect(h.flush).toHaveBeenCalledOnce())
    h.dispose()
    h.status.mockClear()
    save.resolve()
    await work
    expect(h.acknowledge).not.toHaveBeenCalled()
    expect(h.status).not.toHaveBeenCalled()
  })
})
