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
