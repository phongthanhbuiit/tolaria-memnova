import { describe, expect, it, vi } from 'vitest'
import { NoteEditorPersistence, registerNoteEditorPersistence, saveThroughNoteEditor } from './noteEditorPersistence'
import type { NoteMemoryView, NoteWriteRequest, NoteWriteOutcome } from './types'

const pageId = '11111111-1111-4111-8111-111111111111'
const baseline = 'Original article\n<!-- FLASHCARD:BACK -->\nOriginal mnemonic'
const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))), byte=>byte.toString(16).padStart(2,'0')).join('')
function fixture() {
  let revision = 4
  const readNoteMemory = vi.fn(async () => ({ pageId, path: 'a.md', sourceHash: await sha256(baseline), binding: { pageId, cardId: 'card', sourceHash: await sha256(baseline), revision } }) as NoteMemoryView)
  const saveNoteMemory = vi.fn(async (request: NoteWriteRequest): Promise<NoteWriteOutcome> => ({ operationId: request.operationId, pageId, status: 'committed', sourceHash: await sha256(request.source), revision: ++revision, problem: null }))
  const client = { vaultPath: '/library', readNoteMemory, saveNoteMemory }
  const saved = vi.fn()
  const writer = new NoteEditorPersistence({ client, path: '/library/a.md', pageId, source: baseline, onSaved: saved })
  return { writer, client, saved }
}

describe('note editor persistence coordinator', () => {
  it('uses the loaded source hash and nullable binding revision, then advances only after a committed receipt', async () => {
    const { writer, client, saved } = fixture()
    await writer.save('Edited article')
    await writer.save('Edited again')
    expect(client.saveNoteMemory.mock.calls[0][0]).toMatchObject({ pageId, expectedHash: await sha256(baseline), expectedRevision: 4, source: 'Edited article' })
    expect(client.saveNoteMemory.mock.calls[1][0]).toMatchObject({ expectedHash: await sha256('Edited article'), expectedRevision: 5 })
    expect(saved.mock.calls).toEqual([['Edited article'], ['Edited again']])
  })
  it('never substitutes a later disk hash for the content originally loaded into the editor', async () => {
    const { writer, client } = fixture()
    client.readNoteMemory.mockResolvedValue({ pageId, path: 'a.md', sourceHash: 'f'.repeat(64), binding: null } as NoteMemoryView)
    await writer.save('My local draft')
    expect(client.saveNoteMemory.mock.calls[0][0]).toMatchObject({ expectedHash: await sha256(baseline), expectedRevision: null })
  })
  it('retries the identical uncertain operation before saving a newer draft', async () => {
    const { writer, client } = fixture()
    client.saveNoteMemory.mockRejectedValueOnce(Error('Connection interrupted after native write'))
    await expect(writer.save('First draft')).rejects.toThrow('Connection interrupted')
    const intent = client.saveNoteMemory.mock.calls[0][0]
    await writer.save('Newer draft')
    expect(client.saveNoteMemory.mock.calls[1][0]).toEqual(intent)
    expect(client.saveNoteMemory.mock.calls[2][0]).toMatchObject({ source: 'Newer draft', expectedHash: await sha256('First draft') })
    expect(client.saveNoteMemory.mock.calls[2][0].operationId).not.toBe(intent.operationId)
  })
  for (const status of ['pending', 'conflict', 'discarded'] as const) it(`keeps a ${status} draft unsaved and does not start another operation`, async () => {
    const { writer, client, saved } = fixture()
    client.saveNoteMemory.mockImplementation(async request => ({ operationId: request.operationId, pageId, status, sourceHash: 'c'.repeat(64), revision: 4, problem: 'Needs recovery' }))
    await expect(writer.save('Local draft')).rejects.toThrow(status)
    await expect(writer.save('Newer draft')).rejects.toThrow(status)
    expect(client.saveNoteMemory.mock.calls[1][0]).toEqual(client.saveNoteMemory.mock.calls[0][0])
    expect(saved).not.toHaveBeenCalled()
  })
  it('serializes concurrent saves using the preceding committed revision', async () => {
    const { writer, client } = fixture()
    await Promise.all([writer.save('One'), writer.save('Two')])
    expect(client.saveNoteMemory.mock.calls.map(([request]) => request.expectedRevision)).toEqual([4, 5])
  })
  it('does not create journal rows for a no-op', async () => {
    const { writer, client } = fixture()
    await writer.save(baseline)
    expect(client.readNoteMemory).not.toHaveBeenCalled()
    expect(client.saveNoteMemory).not.toHaveBeenCalled()
  })
  it('rejects a late visit before calling the write IPC', async () => {
    const { writer, client } = fixture()
    writer.deactivate()
    await expect(writer.save('Late draft')).rejects.toThrow('stale-editor-visit')
    expect(client.saveNoteMemory).not.toHaveBeenCalled()
  })
  it('does not let cleanup of an old registration remove its replacement', async () => {
    const first = fixture(), second = fixture()
    const disposeFirst = registerNoteEditorPersistence('/library/a.md', first.writer)
    const disposeSecond = registerNoteEditorPersistence('/library/a.md', second.writer)
    disposeFirst()
    expect(await saveThroughNoteEditor('/library/a.md', 'Current draft')).toBe(true)
    expect(first.client.saveNoteMemory).not.toHaveBeenCalled()
    expect(second.client.saveNoteMemory).toHaveBeenCalledOnce()
    disposeSecond()
    expect(await saveThroughNoteEditor('/library/a.md', 'No owner')).toBe(false)
  })
})
