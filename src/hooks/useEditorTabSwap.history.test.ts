import { BlockNoteEditor } from '@blocknote/core'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useEditorTabSwap } from './useEditorTabSwap'
import { clearParsedNoteBlockCache } from './editorParsedBlockCache'

const disposals: Array<() => void> = []
afterEach(() => { cleanup(); disposals.splice(0).forEach(dispose => dispose()); clearParsedNoteBlockCache(); vi.restoreAllMocks() })

function tab(path: string, body: string) {
  return { entry: { path, title: 'Article', filename: 'article.md', type: 'Note', status: 'Active', aliases: [], isA: '' }, content: body }
}
function harness() {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  const editor = BlockNoteEditor.create()
  editor.mount(mount)
  disposals.push(() => { editor.unmount(); mount.remove() })
  const onContentChange = vi.fn()
  const initialProps = { tabs: [tab('/library/a.md', 'Original A')], activeTabPath: '/library/a.md', rawMode: false, contentIdentity: 'article' }
  const hook = renderHook(props => useEditorTabSwap({ ...props, editor, vaultPath: '/library', onContentChange }), { initialProps })
  return { ...hook, editor, onContentChange, initialProps }
}

it('preserves real undo/redo through same-document save acknowledgements and rerenders', async () => {
  const { editor, result, rerender, initialProps, onContentChange } = harness()
  await waitFor(() => expect(editor.prosemirrorState.doc.textContent).toBe('Original A'))
  // Settle the production load acknowledgement before simulating user input.
  await act(() => new Promise(resolve => requestAnimationFrame(resolve)))
  act(() => { editor.updateBlock(editor.document[0], { content: 'Edited A' }); result.current.handleEditorChange(); result.current.flushPendingEditorChange() })
  expect(onContentChange).toHaveBeenCalledWith('/library/a.md', expect.stringContaining('Edited A'))
  rerender({ ...initialProps, tabs: [tab('/library/a.md', 'Edited A')] })
  await act(() => new Promise(resolve => requestAnimationFrame(resolve)))
  act(() => { expect(editor.undo()).toBe(true) })
  expect(editor.prosemirrorState.doc.textContent).toBe('Original A')
  act(() => { expect(editor.redo()).toBe(true) })
  expect(editor.prosemirrorState.doc.textContent).toBe('Edited A')
})

it('isolates real history on same-path face changes and raw content replacements', async () => {
  const { editor, rerender, initialProps } = harness()
  await waitFor(() => expect(editor.prosemirrorState.doc.textContent).toBe('Original A'))
  await act(() => new Promise(resolve => requestAnimationFrame(resolve)))
  act(() => { editor.updateBlock(editor.document[0], { content: 'Edited article' }) })
  const mnemonic = { ...initialProps, tabs: [tab('/library/a.md', 'Mnemonic B')], contentIdentity: 'mnemonic' }
  rerender(mnemonic)
  await waitFor(() => expect(editor.prosemirrorState.doc.textContent).toBe('Mnemonic B'))
  act(() => { editor.undo() })
  expect(editor.prosemirrorState.doc.textContent).toBe('Mnemonic B')
  rerender({ ...mnemonic, rawMode: true })
  rerender({ ...mnemonic, tabs: [tab('/library/a.md', 'Changed in raw mode')] })
  await waitFor(() => expect(editor.prosemirrorState.doc.textContent).toBe('Changed in raw mode'))
  act(() => { editor.undo() })
  expect(editor.prosemirrorState.doc.textContent).toBe('Changed in raw mode')
})
