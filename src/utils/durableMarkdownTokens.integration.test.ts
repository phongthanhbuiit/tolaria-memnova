import { BlockNoteEditor } from '@blocknote/core'
import { expect, it } from 'vitest'
import { injectDurableEditorMarkdownBlocks, preProcessDurableEditorMarkdown, serializeDurableEditorBlocks } from './editorDurableMarkdown'
import { type BlockLike } from './durableMarkdownBlocks'
import { tldrawFenceSource } from './tldrawMarkdown'

it.each([
  { store: { 'shape:LhZ-_aBWyGPVitl6TCMFW': {}, 'shape:BvUmrZiWDexrb57Za_Il_': {} } },
  { text: '*remember this image*' },
  { text: '~~keep the original~~' },
  { text: "Ảnh 🧠: user's (memory)! _word_ and **visual**" },
])('preserves a canvas snapshot containing Markdown syntax through the real parser: %j', async value => {
  const editor = BlockNoteEditor.create()
  const snapshot = JSON.stringify(value, null, 2)
  const markdown = tldrawFenceSource({ boardId: 'memory', height: '520', width: '', snapshot })
  try {
    const parsed = await editor.tryParseMarkdownToBlocks(preProcessDurableEditorMarkdown({ markdown }))
    const blocks = injectDurableEditorMarkdownBlocks(parsed) as BlockLike[]
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('tldrawBlock')
    expect(blocks[0].props?.snapshot).toBe(snapshot)
    expect(serializeDurableEditorBlocks({ blocksToMarkdownLossy: blocks => editor.blocksToMarkdownLossy(blocks as typeof editor.document) }, blocks)).toBe(markdown)
  } finally { editor._tiptapEditor.destroy() }
})
