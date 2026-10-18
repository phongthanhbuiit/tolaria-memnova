import { expect, it, vi } from 'vitest'
import { NoteWorkspaceMutations } from './noteWorkspaceMutations'
import type { LearningClient } from './client'
import type {
  NoteConfigureRequest,
  NoteMemoryView,
  NoteWriteRequest,
} from './types'
import { patchNoteMemoryConfig } from './noteMemoryPatch'

const pageId = '11111111-1111-4111-8111-111111111111'
const source = `---\n_memnova_page_id: ${pageId}\n_memnova_learning_version: 1\n_memnova_learning_enabled: true\n_memnova_back_kind: inline\nStatus: Draft\n---\nArticle\n<!-- FLASHCARD:BACK -->\nMnemonic\n`
async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    ),
    (byte) => byte.toString(16).padStart(2, '0')
  ).join('')
}
function fixture(initial = source) {
  let disk = initial,
    revision = 0
  const read = vi.fn(async () => disk),
    saved = vi.fn(),
    flush = vi.fn()
  const receipt = async (request: NoteWriteRequest | NoteConfigureRequest) => ({
    operationId: request.operationId,
    pageId,
    status: 'committed',
    sourceHash: await hash(disk),
    revision: ++revision,
    problem: null,
  })
  const api = {
    vaultPath: '/library',
    libraryId: 'library',
    readNoteMemory: vi.fn(
      async () =>
        ({
          pageId,
          path: 'a.md',
          sourceHash: await hash(disk),
          state: 'ready',
          config: { version: 1, enabled: true, back: { kind: 'inline' } },
          binding: { revision },
          legacyCardCount: 0,
        }) as NoteMemoryView
    ),
    saveNoteMemory: vi.fn(async (request: NoteWriteRequest) => {
      disk = request.source
      return receipt(request)
    }),
    configureNoteMemory: vi.fn(async (request: NoteConfigureRequest) => {
      disk = patchNoteMemoryConfig(disk, request.config)
      return receipt(request)
    }),
    ensurePage: vi.fn(),
    previewNoteSource: vi.fn(),
  }
  const service = new NoteWorkspaceMutations({
    client: api as unknown as LearningClient,
    read,
    flush,
    onSaved: saved,
  })
  return { api, service, read, saved, disk: () => disk }
}
it('does not register or configure ordinary notes when resolving a property writer', async () => {
  const f = fixture('Article only')
  expect(await f.service.property('/library/a.md', 'Status', 'Done')).toBeNull()
  expect(f.api.ensurePage).not.toHaveBeenCalled()
  expect(f.api.readNoteMemory).not.toHaveBeenCalled()
  expect(f.api.saveNoteMemory).not.toHaveBeenCalled()
})
it('coordinates inactive note properties without changing either face or other fields', async () => {
  const f = fixture()
  expect(await f.service.property('/library/a.md', 'Status', 'Done')).toBe(
    source.replace('Status: Draft', 'Status: "Done"')
  )
  expect(f.api.saveNoteMemory.mock.calls[0][0]).toMatchObject({
    pageId,
    expectedHash: await hash(source),
    expectedRevision: 0,
  })
  expect(f.saved).toHaveBeenCalledWith('/library/a.md', source, f.disk())
})
it('retains an uncertain configuration intent and retries that exact request', async () => {
  const f = fixture()
  f.api.configureNoteMemory.mockRejectedValueOnce(Error('lost response'))
  await expect(f.service.setEnabled('/library/a.md', false)).rejects.toThrow(
    'lost response'
  )
  const request = f.api.configureNoteMemory.mock.calls[0][0]
  await f.service.setEnabled('/library/a.md', false)
  expect(f.api.configureNoteMemory.mock.calls[1][0]).toEqual(request)
  expect(f.disk()).toContain('_memnova_learning_enabled: false')
})
it('rejects work after its Library service is disposed', async () => {
  const f = fixture()
  f.service.dispose()
  await expect(f.service.setEnabled('/library/a.md', false)).rejects.toThrow(
    'stale-note-workspace'
  )
  expect(f.read).not.toHaveBeenCalled()
  expect(f.api.configureNoteMemory).not.toHaveBeenCalled()
})
it('replays its own uncertain receipt before the newly pending state blocks other writers', async () => {
  const f = fixture()
  f.api.configureNoteMemory.mockRejectedValueOnce(Error('lost response'))
  await expect(f.service.setEnabled('/library/a.md', false)).rejects.toThrow(
    'lost response'
  )
  const view = await f.api.readNoteMemory()
  f.api.readNoteMemory.mockResolvedValue({ ...view, state: 'pending' })
  await f.service.setEnabled('/library/a.md', false)
  expect(f.api.configureNoteMemory.mock.calls[1][0]).toEqual(
    f.api.configureNoteMemory.mock.calls[0][0]
  )
})
