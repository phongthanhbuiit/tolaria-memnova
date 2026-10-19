import { BlockNoteEditor } from '@blocknote/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyBlankStateToEditor, applyBlocksToEditor, applyHtmlStateToEditor } from './editorContentSwapApply'

const cleanups: Array<() => void> = []
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.restoreAllMocks() })

function mountedEditor(initial = 'Article A') {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  const editor = BlockNoteEditor.create({ initialContent: [{ type: 'paragraph', content: initial }] })
  editor.mount(mount)
  cleanups.push(() => { editor.unmount(); mount.remove() })
  return editor
}

function load(editor: ReturnType<typeof mountedEditor>, text: string, path = '/fixture/b.md') {
  return applyBlocksToEditor({
    editor, blocks: [{ type: 'paragraph', content: text }], scrollTop: 0,
    editorContentPathRef: { current: '/fixture/a.md' }, suppressChangeRef: { current: false }, targetPath: path,
  })
}
function text(editor: ReturnType<typeof mountedEditor>) { return editor.prosemirrorState.doc.textContent }
function edit(editor: ReturnType<typeof mountedEditor>, value: string) {
  editor.updateBlock(editor.document[0], { content: value })
}

it('loading an existing article cannot be undone into the initial empty document', () => {
  const editor = mountedEditor('')
  expect(load(editor, 'Existing A4 article')).toBe(true)
  expect(text(editor)).toBe('Existing A4 article')
  editor.undo()
  expect(text(editor)).toBe('Existing A4 article')
})

it('switching notes discards both previous edits and redo steps', () => {
  const editor = mountedEditor()
  edit(editor, 'Edited A')
  editor.undo()
  expect(text(editor)).toBe('Article A')
  expect(load(editor, 'Article B')).toBe(true)
  editor.redo()
  expect(text(editor)).toBe('Article B')
  editor.undo()
  expect(text(editor)).toBe('Article B')
})

it('keeps undo and redo for edits made after the load, without crossing its boundary', () => {
  const editor = mountedEditor()
  load(editor, 'Article B')
  edit(editor, 'Edited B')
  expect(editor.undo()).toBe(true)
  expect(text(editor)).toBe('Article B')
  expect(editor.undo()).toBe(false)
  expect(text(editor)).toBe('Article B')
  expect(editor.redo()).toBe(true)
  expect(text(editor)).toBe('Edited B')
})

it('isolates article and mnemonic loads even with the same filesystem path', () => {
  const editor = mountedEditor()
  load(editor, 'Front', '/fixture/a.md')
  edit(editor, 'Edited front')
  load(editor, 'Mnemonic', '/fixture/a.md')
  editor.undo()
  expect(text(editor)).toBe('Mnemonic')
  load(editor, 'Edited front', '/fixture/a.md')
  editor.undo()
  expect(text(editor)).toBe('Edited front')
})

describe.each(['blank', 'html', 'fallback'] as const)('%s document load', mode => {
  it('establishes a new undo boundary and keeps subsequent edits reversible', () => {
    const editor = mountedEditor()
    edit(editor, 'Old edit')
    const options = { editor, editorContentPathRef: { current: '/fixture/a.md' }, suppressChangeRef: { current: false }, targetPath: '/fixture/b.md' }
    if (mode === 'blank') applyBlankStateToEditor(options)
    else if (mode === 'html') applyHtmlStateToEditor({ ...options, markup: '<p>Loaded B</p>' })
    else {
      vi.spyOn(editor, 'replaceBlocks').mockImplementationOnce(() => { throw new Error('exercise HTML fallback') })
      vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(load(editor, 'Loaded B')).toBe(true)
    }
    const loaded = text(editor)
    editor.undo()
    expect(text(editor)).toBe(loaded)
    edit(editor, 'New edit')
    expect(editor.undo()).toBe(true)
    expect(text(editor)).toBe(loaded)
    expect(editor.redo()).toBe(true)
    expect(text(editor)).toBe('New edit')
  })
})
