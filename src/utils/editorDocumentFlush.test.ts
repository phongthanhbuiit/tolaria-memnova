import { expect, it, vi } from 'vitest'
import { flushEditorDocuments, registerEditorDocumentFlush } from './editorDocumentFlush'
import { serializeRichEditorBodyToMarkdown } from './richEditorMarkdown'
it('flushes before reading document blocks for Markdown serialization', () => {
  let blocks = [{ type: 'tldrawBlock', props: { boardId: 'same', snapshot: '{}', height: '520', width: '' } }]
  const editor = { get document() { return blocks }, blocksToMarkdownLossy: vi.fn(() => '') }
  const dispose = registerEditorDocumentFlush(editor, 'block-a', () => {
    blocks = [{ ...blocks[0], props: { ...blocks[0].props, snapshot: '{"records":{"shape:last":{"text":"last stroke"}}}' } }]
    return true
  })
  try { expect(serializeRichEditorBodyToMarkdown(editor as never)).toContain('last stroke') }
  finally { dispose() }
})
it('keeps identical board names isolated between editors and flushes all their blocks', () => {
  const first = {}, second = {}, a = vi.fn(() => true), b = vi.fn(() => true), foreign = vi.fn(() => true)
  const dispose = [registerEditorDocumentFlush(first,'a',a),registerEditorDocumentFlush(first,'b',b),registerEditorDocumentFlush(second,'a',foreign)]
  expect(flushEditorDocuments(first)).toBe(true)
  expect(a).toHaveBeenCalledOnce(); expect(b).toHaveBeenCalledOnce(); expect(foreign).not.toHaveBeenCalled()
  dispose.forEach(fn => fn()); expect(flushEditorDocuments(first)).toBe(false)
})
it('prevents reentrant serialization and stale cleanup from removing a replacement block', () => {
  const editor = {}, old = registerEditorDocumentFlush(editor,'block',() => false)
  const next = vi.fn(() => { expect(flushEditorDocuments(editor)).toBe(false); return true })
  const dispose = registerEditorDocumentFlush(editor,'block',next)
  old(); expect(flushEditorDocuments(editor)).toBe(true); expect(next).toHaveBeenCalledOnce()
  dispose(); expect(flushEditorDocuments(editor)).toBe(false)
})
it('does not hide a flush failure or poison subsequent retries', () => {
  const editor = {}, flush = vi.fn().mockImplementationOnce(() => { throw Error('snapshot failed') }).mockReturnValue(true)
  const dispose = registerEditorDocumentFlush(editor,'block',flush)
  expect(() => flushEditorDocuments(editor)).toThrow('snapshot failed')
  expect(flushEditorDocuments(editor)).toBe(true); dispose()
})
