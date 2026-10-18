import { afterEach, expect, it, vi } from 'vitest'
import { runFrontmatterAndApply } from './frontmatterOps'
import { NoteEditorDocument } from '../lib/learning/noteEditorDocument'
import {
  NoteEditorPersistence,
  registerNoteEditorPersistence,
} from '../lib/learning/noteEditorPersistence'
import type { NoteMemoryView, NoteWriteRequest } from '../lib/learning/types'

const native = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: native.invoke }))
vi.mock('../mock-tauri', () => ({
  isTauri: () => true,
  mockInvoke: vi.fn(),
  updateMockContent: vi.fn(),
  trackMockChange: vi.fn(),
}))
const path = '/library/a.md',
  pageId = '11111111-1111-4111-8111-111111111111'
const raw = `---\n_memnova_page_id: ${pageId}\n_memnova_learning_version: 1\n_memnova_learning_enabled: false\n_memnova_back_kind: inline\nStatus: Draft\nopaque: &value {huge: 9007199254740993, empty: null}\ncopy: *value\n---\nArticle\n<!-- FLASHCARD:BACK -->\nMnemonic\n`
const hash = async (source: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
    ),
    (byte) => byte.toString(16).padStart(2, '0')
  ).join('')
afterEach(() => {
  native.invoke.mockReset()
})

it('edits a configured note property through its canonical writer and keeps the next autosave current', async () => {
  const document = new NoteEditorDocument(path, raw)
  let revision = 4
  const saveNoteMemory = vi.fn(async (request: NoteWriteRequest) => ({
    operationId: request.operationId,
    pageId,
    status: 'committed' as const,
    sourceHash: await hash(request.source),
    revision: ++revision,
    problem: null,
  }))
  const client = {
    vaultPath: '/library',
    saveNoteMemory,
    readNoteMemory: vi.fn(
      async () =>
        ({ pageId, path: 'a.md', binding: { revision: 4 } }) as NoteMemoryView
    ),
  }
  const writer = new NoteEditorPersistence({
    client,
    path,
    pageId,
    source: raw,
    getCurrentSource: () => document.getSnapshot().source,
    onPropertyDraft: (draft) => {
      document.stageProperty(
        draft.beforeSource,
        draft.afterSource,
        draft.key,
        draft.value,
        draft.rememberOnly
      )
    },
    onSaved: (source) => document.markSaved(source),
  })
  const dispose = registerNoteEditorPersistence(path, writer)
  const callbacks = { updateTab: vi.fn(), updateEntry: vi.fn(), toast: vi.fn() }
  try {
    const result = await runFrontmatterAndApply({
      op: 'update',
      path,
      key: 'Status',
      value: 'Done',
      callbacks,
      options: { silent: true },
    })
    expect(saveNoteMemory).toHaveBeenCalledOnce()
    expect(native.invoke).not.toHaveBeenCalled()
    expect(result).toContain('Status: "Done"')
    expect(document.getSnapshot().source).toBe(result)
    document.select('back')
    document.edit(path, 'Changed mnemonic')
    await writer.save(document.getSnapshot().source)
    expect(saveNoteMemory.mock.calls[1][0]).toMatchObject({
      expectedRevision: 5,
      expectedHash: await hash(result!),
      source: expect.stringContaining('Status: "Done"'),
    })
    expect(document.getSnapshot().source).toContain(
      'opaque: &value {huge: 9007199254740993, empty: null}\ncopy: *value'
    )
  } finally {
    dispose()
  }
})
