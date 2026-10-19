import { BlockNoteEditor } from '@blocknote/core'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { applyBlocksToEditor } from '../hooks/editorContentSwapApply'
import { runNativeTextHistoryCommand } from './appOrchestration'

const originalExec = Object.getOwnPropertyDescriptor(document, 'execCommand')
const exec = vi.fn(() => false)
const disposals: Array<() => void> = []
beforeEach(() => { exec.mockClear(); Object.defineProperty(document, 'execCommand', { configurable: true, value: exec }) })
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  if (originalExec) Object.defineProperty(document, 'execCommand', originalExec)
  else Reflect.deleteProperty(document, 'execCommand')
})
function editor() {
  const mount = document.createElement('div')
  mount.className = 'editor__blocknote-container'
  document.body.appendChild(mount)
  const instance = BlockNoteEditor.create()
  instance.mount(mount)
  disposals.push(() => { instance.unmount(); mount.remove() })
  applyBlocksToEditor({ editor: instance, blocks: [{ type: 'paragraph', content: 'Original article' }], scrollTop: 0, targetPath: '/fixture/a.md', editorContentPathRef: { current: null }, suppressChangeRef: { current: false } })
  // jsdom has no text-range geometry; keep real history/keymaps, skip viewport scrolling.
  instance.prosemirrorView.setProps({ handleScrollToSelection: () => true })
  instance.prosemirrorView.dom.focus()
  return instance
}

it('routes menu Undo and Redo through the real rich editor history', () => {
  const rich = editor()
  rich.updateBlock(rich.document[0], { content: 'Changed article' })
  expect(runNativeTextHistoryCommand('undo')).toBe(true)
  expect(rich.prosemirrorState.doc.textContent).toBe('Original article')
  expect(runNativeTextHistoryCommand('redo')).toBe(true)
  expect(rich.prosemirrorState.doc.textContent).toBe('Changed article')
  expect(exec).not.toHaveBeenCalled()
})
it('consumes menu history inside an editor with no remaining text history', () => {
  const rich = editor()
  expect(runNativeTextHistoryCommand('undo')).toBe(true)
  expect(rich.prosemirrorState.doc.textContent).toBe('Original article')
})
it('keeps native input history scoped to the focused input even if the browser has no undo entry', () => {
  const input = document.createElement('input'); document.body.appendChild(input)
  disposals.push(() => input.remove()); input.focus()
  expect(runNativeTextHistoryCommand('undo')).toBe(true)
  expect(exec).toHaveBeenCalledWith('undo')
})
it('yields to application history when focus is outside text editing', () => {
  const button = document.createElement('button'); document.body.appendChild(button)
  disposals.push(() => button.remove()); button.focus()
  expect(runNativeTextHistoryCommand('undo')).toBe(false)
  expect(exec).not.toHaveBeenCalled()
})
