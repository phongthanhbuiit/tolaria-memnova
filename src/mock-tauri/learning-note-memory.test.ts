import { expect, it, vi } from 'vitest'
import { mockLearningCommand } from './learning'
import type { NoteConfigureRequest } from '../lib/learning/types'

const pageId = '00000000-0000-0000-0000-000000000001'
const sourceId = '00000000-0000-0000-0000-000000000002'
const op = '00000000-0000-0000-0000-000000000801'
async function setup() {
  const root = `/qa/note-memory-${crypto.randomUUID()}`
  const files = new Map([
    [`${root}/article.md`, `---\n_memnova_page_id: ${pageId}\n---\nArticle\n<!-- FLASHCARD:BACK -->\nPicture\n`],
    [`${root}/source.md`, `---\n_memnova_page_id: ${sourceId}\n---\nSource\n`],
  ])
  const write = vi.fn(async (path: string, content: string) => { files.set(path, content) })
  const context = { read: async (path: string) => { const content = files.get(path); if (content === undefined) throw Error('Missing source'); return content }, write, entries: async () => [] }
  const descriptor = await mockLearningCommand({ vaultPath: root, request: { kind: 'describe' } }, context) as { libraryId: string }
  const call = (request: Record<string, unknown>) => mockLearningCommand({ vaultPath: root, libraryId: descriptor.libraryId, request }, context)
  const page = await call({ kind: 'ensurePage', path: 'article.md' }) as { id: string }
  expect(page.id).toBe(pageId)
  await call({ kind: 'ensurePage', path: 'source.md' })
  const state = await call({ kind: 'readNoteMemory', pageId }) as { sourceHash: string }
  const request: NoteConfigureRequest = { operationId: op, pageId, expectedHash: state.sourceHash, expectedRevision: null, config: { version: 1, enabled: true, back: { kind: 'inline' } } }
  return { root, files, write, call, request }
}

it('models note activation, exact config replay and bound legacy guards without read writes', async () => {
  const { root, files, call, request } = await setup()
  const result = await call({ kind: 'configureNoteMemory', request })
  expect(result).toMatchObject({ status: 'committed', revision: 0 })
  const storage = vi.spyOn(Storage.prototype, 'setItem')
  let cardId: string
  try {
    const state = await call({ kind: 'readNoteMemory', pageId }) as { binding: { cardId: string } }
    expect(state).toMatchObject({ state: 'ready', pendingOperations: [], schedule: { reps: 0 } })
    cardId = state.binding.cardId
    expect(storage).not.toHaveBeenCalled()
  } finally { storage.mockRestore() }
  await expect(call({ kind: 'listCards', pageId, includeTrashed: true })).resolves.toEqual([])
  await expect(call({ kind: 'cloneCard', cardId })).rejects.toThrow('bound-note-card')
  await expect(call({ kind: 'updateCard', cardId, revision: 0, draft: { front: 'Competing', back: 'SQL', answerMode: 'inline', status: 'active', position: 0, properties: {} } })).rejects.toThrow('bound-note-card')
  files.set(`${root}/article.md`, 'External content after committed receipt')
  expect(await call({ kind: 'configureNoteMemory', request })).toEqual(result)
  await expect(call({ kind: 'configureNoteMemory', request: { ...request, config: { ...request.config, enabled: false } } })).rejects.toThrow('intent')
  expect(files.get(`${root}/article.md`)).toBe('External content after committed receipt')
})

it('keeps failed writes pending and retries one operation without duplicate learning identity', async () => {
  const { write, call, request } = await setup()
  write.mockRejectedValueOnce(Error('Disk full'))
  expect(await call({ kind: 'configureNoteMemory', request })).toMatchObject({ status: 'pending' })
  expect(await call({ kind: 'readNoteMemory', pageId })).toMatchObject({ state: 'pending', pendingOperations: [{ operationId: op, phase: 'prepared' }] })
  await expect(call({ kind: 'createCard', pageId, draft: { front: 'Competing', back: 'SQL', answerMode: 'inline', status: 'active', position: 0, properties: {} } })).rejects.toThrow('pending-note-operation')
  const completed = await call({ kind: 'resumeNoteMemory', operationId: op })
  expect(completed).toMatchObject({ status: 'committed' })
  expect(await call({ kind: 'resumeNoteMemory', operationId: op })).toEqual(completed)
  expect(write).toHaveBeenCalledTimes(2)
})

it('links one source face without enabling or reviewing that source', async () => {
  const { call, request } = await setup()
  request.config.back = { kind: 'page', pageId: sourceId, face: 'front' }
  expect(await call({ kind: 'configureNoteMemory', request })).toMatchObject({ status: 'committed' })
  expect(await call({ kind: 'readNoteMemory', pageId: sourceId })).toMatchObject({ state: 'ordinary', binding: null, schedule: null })
})

it('does not persist no-op reconciliation of an ordinary or unchanged bound note', async () => {
  const { call, request } = await setup()
  const write = vi.spyOn(Storage.prototype, 'setItem')
  try {
    await call({ kind: 'reconcileNoteMemory', pageId })
    expect(write).not.toHaveBeenCalled()
    await call({ kind: 'configureNoteMemory', request })
    write.mockClear()
    await call({ kind: 'reconcileNoteMemory', pageId })
    expect(write).not.toHaveBeenCalled()
  } finally { write.mockRestore() }
})

it('reports a corrupt mnemonic even when the article is empty', async () => {
  const { root, files, call, request } = await setup()
  const path = `${root}/article.md`
  files.set(path, files.get(path)!.replace('Article\n', '').replace('Picture', '```tldraw\n{broken\n```'))
  const view = await call({ kind: 'readNoteMemory', pageId }) as { sourceHash: string }
  await call({ kind: 'configureNoteMemory', request: { ...request, expectedHash: view.sourceHash } })
  expect(await call({ kind: 'readNoteMemory', pageId })).toMatchObject({ state: 'invalid' })
})

it('registers existing source UUIDs during browser sync without rewriting Markdown', async () => {
  const root = `/qa/note-sync-${crypto.randomUUID()}`
  const { makeEntry } = await import('../test-utils/noteListTestUtils')
  const write = vi.fn(async () => undefined)
  const context = { read: async () => `---\n_memnova_page_id: ${pageId}\n---\nArticle`, write, entries: async () => [makeEntry({ path: `${root}/article.md`, title: 'Article' })] }
  const descriptor = await mockLearningCommand({ vaultPath: root, request: { kind: 'describe' } }, context) as { libraryId: string }
  const args = { vaultPath: root, libraryId: descriptor.libraryId }
  expect(await mockLearningCommand({ ...args, request: { kind: 'syncPages' } }, context)).toMatchObject([{ id: pageId, path: 'article.md' }])
  expect(await mockLearningCommand({ ...args, request: { kind: 'ensurePage', path: 'article.md' } }, context)).toMatchObject({ id: pageId })
  expect(write).not.toHaveBeenCalled()
})

it('serializes concurrent configuration retries into one file write and binding', async () => {
  const { call, request, write } = await setup()
  const results = await Promise.all([call({ kind: 'configureNoteMemory', request }), call({ kind: 'configureNoteMemory', request })])
  expect(results[0]).toEqual(results[1])
  expect(write).toHaveBeenCalledTimes(1)
  expect(await call({ kind: 'readNoteMemory', pageId })).toMatchObject({ state: 'ready', binding: { revision: 0 } })
})
