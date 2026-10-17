import { expect, it, vi } from 'vitest'
import { mockLearningCommand } from './learning'
import { makeEntry } from '../test-utils/noteListTestUtils'
it('keeps learning reads and unchanged source syncs free of storage writes', async () => {
  const root = '/qa/read-only-learning'
  const context = { read: async () => '# Lesson', entries: vi.fn().mockResolvedValue([makeEntry({ path: `${root}/lesson.md`, title: 'Lesson' })]) }
  const descriptor = await mockLearningCommand({ vaultPath: root, request: { kind: 'describe' } }, context) as { libraryId: string }
  const args = { vaultPath: root, libraryId: descriptor.libraryId }
  await mockLearningCommand({ ...args, request: { kind: 'syncPages' } }, context)
  const write = vi.spyOn(Storage.prototype, 'setItem')
  try {
    for (const kind of ['describe', 'migrationStatus', 'listPages', 'listCards', 'studyStats', 'syncPages']) await mockLearningCommand({ ...args, request: { kind } }, context)
    expect(write).not.toHaveBeenCalled()
    context.entries.mockResolvedValue([makeEntry({ path: `${root}/lesson.md`, title: 'Changed title' })])
    await mockLearningCommand({ ...args, request: { kind: 'syncPages' } }, context)
    expect(write).toHaveBeenCalledTimes(1)
  } finally { write.mockRestore() }
})
