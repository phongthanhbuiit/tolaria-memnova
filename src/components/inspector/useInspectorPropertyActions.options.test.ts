import { renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useInspectorPropertyActions } from './useInspectorPropertyActions'
import { makeEntry } from '../../test-utils/noteListTestUtils'
it('forwards silent failure propagation while retaining the active-note guard', async () => {
  const update = vi.fn().mockRejectedValue(Error('Disk full')),
    remove = vi.fn().mockResolvedValue(undefined)
  const entry = makeEntry({ path: '/qa/page.md' })
  const { result } = renderHook(() =>
    useInspectorPropertyActions({
      entry,
      onUpdateFrontmatter: update,
      onDeleteProperty: remove,
    }),
  )
  await expect(
    result.current.handleUpdateProperty!('flag', false, { silent: true }),
  ).rejects.toThrow('Disk full')
  expect(update).toHaveBeenCalledWith('/qa/page.md', 'flag', false, {
    silent: true,
    requireActivePath: '/qa/page.md',
  })
  await result.current.handleDeleteProperty!('flag', { silent: true })
  expect(remove).toHaveBeenCalledWith('/qa/page.md', 'flag', {
    silent: true,
    requireActivePath: '/qa/page.md',
  })
})
