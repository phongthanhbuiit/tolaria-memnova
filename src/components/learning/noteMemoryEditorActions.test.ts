import { expect, it, vi } from 'vitest'
import { registerNoteMnemonicEditor, requestNoteMnemonicEditor } from './noteMemoryEditorActions'

it('routes an explicit request only to its Library and mounted editor', async () => {
  const edit = vi.fn().mockResolvedValue(undefined)
  const remove = registerNoteMnemonicEditor('/library', '/library/a.md', edit)
  await expect(requestNoteMnemonicEditor('/other', '/library/a.md')).rejects.toThrow('note-editor-unavailable')
  await requestNoteMnemonicEditor('/library', '/library/a.md')
  expect(edit).toHaveBeenCalledOnce()
  remove()
  await expect(requestNoteMnemonicEditor('/library', '/library/a.md')).rejects.toThrow('note-editor-unavailable')
})

it('keeps a newer registration when an older editor unmounts and propagates save failures', async () => {
  const older = registerNoteMnemonicEditor('/library', '/library/a.md', vi.fn())
  const edit = vi.fn().mockRejectedValue(Error('Save failed'))
  const newer = registerNoteMnemonicEditor('/library', '/library/a.md', edit)
  older()
  await expect(requestNoteMnemonicEditor('/library', '/library/a.md')).rejects.toThrow('Save failed')
  newer()
})
