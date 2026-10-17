import { expect, it, vi } from 'vitest'
import {
  pageEditorValues,
  pageWireValues,
  persistPageValues,
} from './pagePropertyDraft'
import type { LearningPage } from './types'
const page = {
  id: '11111111-1111-4111-8111-111111111111',
  path: 'nested/source.md',
  title: 'Same',
  available: true,
  createdAt: null,
  modifiedAt: null,
} satisfies LearningPage
it('preserves aliases and refuses ambiguous titles while new links use the selected path', () => {
  const definitions = { source: { valueKind: 'page' as const } }
  const original = { source: '[[nested/source|alias]]', flag: false }
  const editor = pageEditorValues(original, definitions, [page])
  expect(editor.source).toEqual({ pageId: page.id, label: 'alias' })
  expect(pageWireValues(editor, definitions, [page], original, editor)).toEqual(
    original,
  )
  const changed = {
    ...editor,
    source: { pageId: page.id, label: 'changed label' },
  }
  expect(
    pageWireValues(changed, definitions, [page], original, editor).source,
  ).toBe('[[nested/source]]')
  const other = {
    ...page,
    id: '22222222-2222-4222-8222-222222222222',
    path: 'other.md',
  }
  expect(
    pageEditorValues({ source: '[[Same]]' }, definitions, [page, other]).source,
  ).toBe('[[Same]]')
})
it('writes no Markdown on no-op and preserves acknowledged progress after partial failure', async () => {
  const progress = { old: 'retained', zero: 0, flag: false, list: [] }
  const update = vi.fn().mockResolvedValue(undefined),
    remove = vi
      .fn()
      .mockRejectedValueOnce(Error('Disk full'))
      .mockResolvedValue(undefined)
  await persistPageValues(
    progress,
    { ...progress },
    { update, remove },
    () => true,
  )
  expect(update).not.toHaveBeenCalled()
  expect(remove).not.toHaveBeenCalled()
  const next = { renamed: 'retained', zero: 0, flag: false, list: [] }
  await expect(
    persistPageValues(progress, next, { update, remove }, () => true),
  ).rejects.toThrow('Disk full')
  expect(update).toHaveBeenCalledOnce()
  expect(update).toHaveBeenCalledWith('renamed', 'retained')
  await persistPageValues(progress, next, { update, remove }, () => true)
  expect(update).toHaveBeenCalledOnce()
  expect(progress).toEqual(next)
})
it('does not continue writes after an owner generation changes', async () => {
  const update = vi.fn(),
    remove = vi.fn()
  await expect(
    persistPageValues({}, { new: 'value' }, { update, remove }, () => false),
  ).rejects.toThrow()
  expect(update).not.toHaveBeenCalled()
  expect(remove).not.toHaveBeenCalled()
})
