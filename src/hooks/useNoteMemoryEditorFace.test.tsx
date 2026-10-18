import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import {
  LearningContext,
  type LearningWorkspace,
} from '../components/learning/LearningContext'
import { useFlashcardEditorFace } from './useFlashcardEditorFace'
import type { LearningClient } from '../lib/learning/client'
import type { MemoryBack } from '../lib/learning/noteMemoryConfig'
import type {
  NoteConfigureRequest,
  NoteMemoryView,
  NoteWriteRequest,
} from '../lib/learning/types'
import { parseNoteMemoryDocument } from '../lib/learning/noteMemoryDocument'
import { patchNoteMemoryConfig } from '../lib/learning/noteMemoryPatch'
import { saveThroughNoteEditor } from '../lib/learning/noteEditorPersistence'
import type { VaultEntry } from '../types'

const pageId = '11111111-1111-4111-8111-111111111111',
  path = '/library/a.md'
const source = `---\n_memnova_page_id: ${pageId}\n_memnova_learning_version: 1\n_memnova_learning_enabled: false\n_memnova_back_kind: inline\ncustom: 9007199254740999\n---\nArticle\n<!-- FLASHCARD:BACK -->\nRetained local mnemonic\n`
const hash = async (text: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    ),
    (byte) => byte.toString(16).padStart(2, '0')
  ).join('')
const back: MemoryBack = {
  kind: 'page',
  pageId: '22222222-2222-4222-8222-222222222222',
  face: 'front',
}

it('keeps a newer article stroke while its own configuration commits through the shared writer', async () => {
  let currentSource = source,
    revision = 4,
    complete!: () => void
  const response = new Promise<void>((resolve) => {
    complete = resolve
  })
  const configureNoteMemory = vi.fn(async (request: NoteConfigureRequest) => {
    const after = patchNoteMemoryConfig(currentSource, request.config)
    await response
    currentSource = after
    return {
      operationId: request.operationId,
      pageId,
      status: 'committed' as const,
      sourceHash: await hash(after),
      revision: ++revision,
      problem: null,
    }
  })
  const saveNoteMemory = vi.fn(async (request: NoteWriteRequest) => {
    currentSource = request.source
    return {
      operationId: request.operationId,
      pageId,
      status: 'committed' as const,
      sourceHash: await hash(currentSource),
      revision: ++revision,
      problem: null,
    }
  })
  const client = {
    vaultPath: '/library',
    libraryId: 'library',
    configureNoteMemory,
    saveNoteMemory,
    readNoteMemory: async () =>
      ({
        pageId,
        path: 'a.md',
        binding: {
          pageId,
          cardId: 'card',
          sourceHash: await hash(currentSource),
          revision,
        },
      }) as NoteMemoryView,
  }
  const refresh = vi.fn(async () => {}),
    onContentChange = vi.fn()
  const workspace = {
    root: '/library',
    phase: 'ready',
    client: client as unknown as LearningClient,
    refresh,
  } as LearningWorkspace
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LearningContext.Provider value={workspace}>
      {children}
    </LearningContext.Provider>
  )
  const { result } = renderHook(
    () =>
      useFlashcardEditorFace({
        disableLegacy: true,
        entry: { path, properties: {} } as VaultEntry,
        fullContent: source,
        onContentChange,
      }),
    { wrapper }
  )
  let pending!: Promise<void>
  await act(async () => {
    pending = result.current.configureBack!(back)
    await vi.waitFor(() => expect(configureNoteMemory).toHaveBeenCalledOnce())
  })
  const draft = result.current.getCanonicalDocument!()
  expect(parseNoteMemoryDocument(draft).config?.back).toEqual(back)
  act(() =>
    result.current.handleEditorContentChange(
      path,
      `${source.slice(0, source.indexOf('Article'))}New last article stroke`
    )
  )
  await act(async () => {
    complete()
    await pending
  })
  const latest = result.current.getCanonicalDocument!()
  expect(parseNoteMemoryDocument(latest)).toMatchObject({
    front: 'New last article stroke\n',
    back: 'Retained local mnemonic\n',
    config: { enabled: false, back },
  })
  expect(refresh).toHaveBeenCalledOnce()
  await act(async () => {
    expect(await saveThroughNoteEditor(path, latest)).toBe(true)
  })
  expect(saveNoteMemory.mock.calls[0][0]).toMatchObject({
    expectedHash: await hash(
      patchNoteMemoryConfig(source, { version: 1, enabled: false, back })
    ),
    expectedRevision: 5,
    source: latest,
  })
})
