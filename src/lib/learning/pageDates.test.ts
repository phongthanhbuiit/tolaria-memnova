import { expect, it } from 'vitest'
import { withLearningPageDates } from './pageDates'
import type { VaultEntry } from '../../types'
it('shows the recorded creation date after an atomic ID write without changing other libraries or modification time', () => {
  const entry = { path: '/library/lesson.md', createdAt: 5000, modifiedAt: 9000 } as VaultEntry
  const other = { path: '/other/lesson.md', createdAt: 6000 } as VaultEntry
  const result = withLearningPageDates([entry, other], [{ id: 'page', path: 'lesson.md', title: 'Lesson', createdAt: 1000, modifiedAt: 9000, available: true }], '/library')
  expect(result[0].createdAt).toBe(1000); expect(result[0].modifiedAt).toBe(9000)
  expect(result[1]).toBe(other); expect(entry.createdAt).toBe(5000)
})
