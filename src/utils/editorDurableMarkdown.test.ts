import { snippetMarkdown } from './snippetMarkdown'
import { describe, expect, it, vi } from 'vitest'
import {
  injectDurableEditorMarkdownBlocks,
  preProcessDurableEditorMarkdown,
  serializeDurableEditorBlocks,
} from './editorDurableMarkdown'
import { MERMAID_BLOCK_TYPE } from './mermaidMarkdown'
import { EXCALIDRAW_BLOCK_TYPE } from './excalidrawMarkdown'

describe('editor durable markdown blocks', () => {
  it('round-trips Mermaid and excalidraw blocks through one durable pipeline', () => {
    const markdown = [
      'Intro',
      '',
      '```excalidraw id="map" height="640" width="900"',
      '{ "store": {} }',
      '```',
      '',
      '```mermaid',
      'flowchart LR',
      '  A --> B',
      '```',
    ].join('\n')
    const preprocessed = preProcessDurableEditorMarkdown({ markdown })
    const blocks = injectDurableEditorMarkdownBlocks([
      { type: 'paragraph', content: [{ type: 'text', text: 'Intro', styles: {} }], children: [] },
      { type: 'paragraph', content: [{ type: 'text', text: preprocessed.split('\n\n')[1], styles: {} }], children: [] },
      { type: 'paragraph', content: [{ type: 'text', text: preprocessed.split('\n\n')[2], styles: {} }], children: [] },
    ]) as Array<{ type: string; props?: Record<string, string>; content?: Array<{ text?: string }> }>

    expect(blocks.map(block => block.type)).toEqual(['paragraph', EXCALIDRAW_BLOCK_TYPE, MERMAID_BLOCK_TYPE])
    expect(blocks[1].props).toMatchObject({ boardId: 'map', height: '640', snapshot: '{ "store": {} }', width: '900' })
    expect(blocks[2].props).toMatchObject({ diagram: 'flowchart LR\n  A --> B\n' })

    const editor = {
      blocksToMarkdownLossy: vi.fn((ordinaryBlocks: unknown[]) => {
        return (ordinaryBlocks as Array<{ content?: Array<{ text?: string }> }>)
          .map(block => block.content?.map(item => item.text ?? '').join('') ?? '')
          .join('\n\n')
      }),
    }

    expect(serializeDurableEditorBlocks(editor, blocks)).toBe(markdown)
  })
})

it('keeps an unconfigured standalone back marker as a durable comment while leaving fenced examples literal', () => {
  const marker = '<!-- FLASHCARD:BACK -->'
  const processed = preProcessDurableEditorMarkdown({ markdown: `Before\n\n${marker}\n\nAfter` })
  expect(processed).not.toContain(marker)
  const paragraphs = processed.split('\n\n').map(text => ({ type: 'paragraph', content: [{ type: 'text', text, styles: {} }], children: [] }))
  const blocks = injectDurableEditorMarkdownBlocks(paragraphs)
  const serializer = { blocksToMarkdownLossy: (values: unknown[]) => (values as typeof paragraphs).map(value => value.content.map(text => text.text).join('')).join('\n\n') }
  expect(serializeDurableEditorBlocks(serializer, blocks)).toBe(`Before\n\n${marker}\n\nAfter`)
  const fenced = `\`\`\`html\n${marker}\n\`\`\``
  expect(preProcessDurableEditorMarkdown({ markdown: fenced })).toBe(fenced)
})

it.each(['\n', '\r\n'])('isolates an ordinary comment adjacent to prose with %j line endings', ending => {
  const marker = '<!-- FLASHCARD:BACK -->'
  const processed = preProcessDurableEditorMarkdown({ markdown: `Before${ending}${marker}${ending}After` })
  const paragraphs = processed.trim().split(/\r?\n(?:\r?\n)+/).map(text => ({ type: 'paragraph', content: [{ type: 'text', text, styles: {} }] }))
  const blocks = injectDurableEditorMarkdownBlocks(paragraphs) as typeof paragraphs
  expect(blocks.map(b => b.type)).toEqual(['paragraph', 'literalNoteMarker', 'paragraph'])
  const serializer = { blocksToMarkdownLossy: (values: unknown[]) => (values as typeof paragraphs).map(v => v.content.map(t => t.text).join('')).join('\n\n') }
  const saved = serializeDurableEditorBlocks(serializer, blocks)
  expect(saved).toBe(`Before\n\n${marker}\n\nAfter`)
  expect(saved).not.toContain('@@MEMNOVA_')
})

it.each(['whiteboard', ['tl', 'draw'].join('')])('keeps an unsupported drawing opaque and round-trips its source (%s)', language => {
  const drawing = `~~~${language} id="original"\r\n{"schema":{},"store":{"marker":"[link]"}}\r\n~~~`
  const preprocessed = preProcessDurableEditorMarkdown({ markdown: drawing }).trim()
  expect(preprocessed).not.toContain('{"schema":')
  const blocks = injectDurableEditorMarkdownBlocks([{ type: 'paragraph', content: [{ type: 'text', text: preprocessed }] }])
  expect(blocks[0]).toMatchObject({ type: 'unsupportedDrawing', props: { source: drawing } })
  const blocksToMarkdownLossy = vi.fn(() => '')
  expect(serializeDurableEditorBlocks({ blocksToMarkdownLossy }, blocks)).toBe(drawing)
  expect(blocksToMarkdownLossy).not.toHaveBeenCalled()
})

it('preserves each source line of an unsupported fence in a blockquote', () => {
  const source = '> ~~~whiteboard\r\n> {"snapshot":true}\r\n> ~~~'
  const text = preProcessDurableEditorMarkdown({ markdown: source }).trim()
  const blocks = injectDurableEditorMarkdownBlocks([{ type: 'paragraph', content: [{ type: 'text', text }] }])
  expect(blocks[0]).toMatchObject({ type: 'unsupportedDrawing', props: { source } })
  expect(serializeDurableEditorBlocks({ blocksToMarkdownLossy: () => '' }, blocks)).toBe(source)
})

it('does not treat an indented code sample as an Excalidraw snippet fence', () => {
  const code = '    ~~~excalidraw\n    literal code\n    ~~~'
  expect(snippetMarkdown(code)).toBe(code)
})
