import { expect, it, vi } from 'vitest'
import {
  applyNoteSourceRefresh,
  readNoteSourceRefresh,
} from './noteSourceRefresh'

it('reads only clean open notes in the current Library', async () => {
  const tabs = [
    { entry: { path: '/library/a.md' }, content: 'old' },
    { entry: { path: '/library/dirty.md' }, content: 'my draft' },
    { entry: { path: '/library-extra/b.md' }, content: 'other' },
  ]
  const read = vi.fn().mockResolvedValue('converted')
  const updates = await readNoteSourceRefresh(
    tabs,
    '/library',
    (path) => path.includes('dirty'),
    read
  )
  expect(read.mock.calls).toEqual([['/library/a.md']])
  const newer = tabs.map((tab) =>
    tab.entry.path === '/library/a.md'
      ? { ...tab, content: 'typed during reload' }
      : tab
  )
  expect(applyNoteSourceRefresh(newer, updates)).toBe(newer)
  expect(applyNoteSourceRefresh(tabs, updates)[0].content).toBe('converted')
})
it('never recreates a closed tab or replaces content after a failed read', async () => {
  const tabs = [{ entry: { path: '/library/a.md' }, content: 'old' }]
  const read = vi.fn().mockRejectedValue(Error('missing source'))
  await expect(
    readNoteSourceRefresh(tabs, '/library', () => false, read)
  ).rejects.toThrow('missing source')
  const closed: typeof tabs = []
  expect(
    applyNoteSourceRefresh(closed, [
      { path: '/library/a.md', before: 'old', after: 'converted' },
    ])
  ).toBe(closed)
})
