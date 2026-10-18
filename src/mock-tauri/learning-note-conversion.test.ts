import { makeEntry } from '../test-utils/noteListTestUtils'
import { expect, it, vi } from 'vitest'
import { mockLearningCommand } from './learning'
import type { NoteConversionPreview } from '../lib/learning/noteConversionTypes'

it('previews an unopened browser fixture without storage, ID or Markdown writes', async () => {
  const root = `/qa/conversion-${crypto.randomUUID()}`
  const raw = '---\ncustom: {raw: true}\n---\nArticle\n<!-- FLASHCARD:BACK -->\nMnemonic\n'
  const context = { read: async () => raw, entries: async () => [makeEntry({ path: `${root}/lesson.md`, title: 'Lesson' })], write: vi.fn() }
  const storage = vi.spyOn(Storage.prototype, 'setItem')
  const uuid = vi.spyOn(crypto, 'randomUUID')
  try {
    const result = await mockLearningCommand({ vaultPath: root, libraryId: null, request: { kind: 'previewNoteConversion' } }, context) as NoteConversionPreview
    expect(result).toMatchObject({ state: 'importRequired', libraryId: null, pages: [{ pageId: null, classification: 'legacyMarkdown', front: 'Article\n', back: 'Mnemonic\n', candidates: [] }] })
    expect(storage).not.toHaveBeenCalled(); expect(context.write).not.toHaveBeenCalled(); expect(uuid).not.toHaveBeenCalled()
  } finally { storage.mockRestore(); uuid.mockRestore() }
})

async function conversionFixture() {
  const root = `/qa/convert-apply-${crypto.randomUUID()}`
  const pageId = '00000000-0000-0000-0000-000000000002'
  const cardId = '00000000-0000-0000-0000-000000000101'
  const operationId = '00000000-0000-0000-0000-000000000801'
  const files = new Map([[`${root}/lesson.md`, `---\n_memnova_page_id: ${pageId}\ncustom: &value {keep: true}\ncopy: *value\n---\nArticle\n<!-- FLASHCARD:BACK -->\nMnemonic\n`]])
  const write = vi.fn(async (path: string, content: string) => { files.set(path, content) })
  const context = { write, entries: async () => [makeEntry({ path: `${root}/lesson.md`, title: 'Lesson' })], read: async (path: string) => { const raw = files.get(path); if (raw === undefined) throw Error('Missing source'); return raw } }
  const descriptor = await mockLearningCommand({ vaultPath: root, request: { kind: 'describe' } }, context) as { libraryId: string }
  const call = <T,>(request: Record<string, unknown>) => mockLearningCommand({ vaultPath: root, libraryId: descriptor.libraryId, request }, context) as Promise<T>
  await call({ kind: 'ensurePage', path: 'lesson.md' })
  const card = await call<import('../lib/learning/types').LearningCard>({ kind: 'createCard', operationId: cardId, pageId, draft: { front: 'SQL question', back: 'SQL answer', answerMode: 'inline', status: 'active', position: 0, properties: { unknown: [false, null] } } })
  const preview = await call<NoteConversionPreview>({ kind: 'previewNoteConversion' })
  const request = { operationId, pageId, expectedFingerprint: preview.pages[0].fingerprint, front: { kind: 'markdown' as const }, back: { kind: 'inline' as const, source: { kind: 'markdown' as const } }, memory: { kind: 'reuse' as const, cardId, confirmedSameGoal: true } }
  return { root, files, write, call, card, request }
}
it('models explicit reuse, preserved compatibility data and exact replay after source deletion', async () => {
  const { root, files, call, card, request } = await conversionFixture()
  const result = await call<import('../lib/learning/noteConversionTypes').NoteConversionResult>({ kind: 'applyNoteConversion', request })
  expect(result).toMatchObject({ outcome: { status: 'committed' }, cardId: card.id, retainedLegacyCards: 0 })
  expect(await call({ kind: 'readNoteMemory', pageId: request.pageId })).toMatchObject({ state: 'ready', binding: { cardId: card.id }, schedule: card.schedule })
  expect(await call({ kind: 'listCards', pageId: request.pageId, includeTrashed: true })).toEqual([])
  expect(await call({ kind: 'noteCompatibility', pageId: request.pageId })).toMatchObject({ legacyCards: [{ card: { front: card.front, back: card.back, properties: card.properties }, propertiesRaw: JSON.stringify(card.properties) }] })
  files.delete(`${root}/lesson.md`)
  expect(await call({ kind: 'applyNoteConversion', request })).toEqual(result)
  expect(await call({ kind: 'resumeNoteConversion', operationId: request.operationId })).toEqual(result)
  expect((await call<unknown[]>({ kind: 'listBackups' })).length).toBe(1)
})
it('keeps a failed conversion pending, guards competing writers, and resumes the same identity', async () => {
  const { root, files, write, call, request, card } = await conversionFixture()
  const before = files.get(`${root}/lesson.md`)
  write.mockRejectedValueOnce(Error('Disk full'))
  expect(await call({ kind: 'applyNoteConversion', request })).toMatchObject({ outcome: { status: 'pending' } })
  expect(files.get(`${root}/lesson.md`)).toBe(before)
  expect(await call({ kind: 'readNoteMemory', pageId: request.pageId })).toMatchObject({ state: 'pending', pendingOperations: [{ kind: 'convert' }] })
  await expect(call({ kind: 'cloneCard', cardId: card.id })).rejects.toThrow('pending')
  await expect(call({ kind: 'createBackup' })).rejects.toThrow('pending')
  expect(await call({ kind: 'resumeNoteMemory', operationId: request.operationId })).toMatchObject({ status: 'committed' })
  expect(write).toHaveBeenCalledTimes(2)
  expect((await call<unknown[]>({ kind: 'listBackups' })).length).toBe(1)
})
it('rejects stale and unconfirmed conversion selections before any backup or source write', async () => {
  const { root, files, write, call, request } = await conversionFixture()
  await expect(call({ kind: 'applyNoteConversion', request: { ...request, memory: { ...request.memory, confirmedSameGoal: false } } })).rejects.toThrow('confirm-same-learning-goal')
  files.set(`${root}/lesson.md`, `${files.get(`${root}/lesson.md`)}External edit\n`)
  await expect(call({ kind: 'applyNoteConversion', request })).rejects.toThrow('conversion-preview-changed')
  expect(write).not.toHaveBeenCalled()
  expect(await call({ kind: 'listBackups' })).toEqual([])
})
it('does not commit a browser conversion over an external edit during the source writer', async () => {
  const { root, files, write, call, request, card } = await conversionFixture()
  write.mockImplementationOnce(async (path, content) => { files.set(path, content.replace('Article', 'External article')) })
  expect(await call({ kind: 'applyNoteConversion', request })).toMatchObject({ outcome: { status: 'conflict' } })
  expect(files.get(`${root}/lesson.md`)).toContain('External article')
  expect(await call({ kind: 'readNoteMemory', pageId: request.pageId })).toMatchObject({ binding: null })
  expect(await call({ kind: 'listCards', pageId: request.pageId, includeTrashed: true })).toEqual([card])
})
it('creates one fresh browser memory for concurrent exact requests and retains the old card', async () => {
  const { call, request, card } = await conversionFixture()
  const choice = { ...request, memory: { kind: 'fresh' } }
  const [first, second] = await Promise.all([call<import('../lib/learning/noteConversionTypes').NoteConversionResult>({ kind: 'applyNoteConversion', request: choice }), call<import('../lib/learning/noteConversionTypes').NoteConversionResult>({ kind: 'applyNoteConversion', request: choice })])
  expect(first).toEqual(second); expect(first.cardId).not.toBe(card.id)
  expect(first.retainedLegacyCards).toBe(1)
  expect(await call({ kind: 'listCards', pageId: request.pageId, includeTrashed: true })).toEqual([card])
  expect((await call<unknown[]>({ kind: 'listBackups' })).length).toBe(1)
})
