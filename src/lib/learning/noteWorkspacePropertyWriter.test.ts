import { expect, it, vi } from 'vitest'
import {
  propertyThroughNoteEditor,
  registerNoteWorkspacePropertyWriter,
} from './noteEditorPersistence'

it('routes inactive properties only through the owning Library and removes the fallback on disposal', async () => {
  const write = vi.fn().mockResolvedValue('Updated source')
  const dispose = registerNoteWorkspacePropertyWriter('/library', write)
  try {
    expect(
      await propertyThroughNoteEditor('/library/a.md', 'Status', 'Done')
    ).toBe('Updated source')
    expect(write).toHaveBeenCalledWith('/library/a.md', 'Status', 'Done')
    expect(
      await propertyThroughNoteEditor('/library-extra/a.md', 'Status', 'Done')
    ).toBeNull()
    expect(write).toHaveBeenCalledOnce()
  } finally {
    dispose()
  }
  expect(
    await propertyThroughNoteEditor('/library/a.md', 'Status', 'Done')
  ).toBeNull()
})
