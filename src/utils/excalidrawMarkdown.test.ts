import { describe, expect, it } from 'vitest'
import {
  EXCALIDRAW_BLOCK_TYPE,
  injectExcalidrawInBlocks,
  preProcessExcalidrawMarkdown,
  excalidrawFenceSource,
} from './excalidrawMarkdown'

describe('excalidraw markdown round-trip', () => {
  it('injects fenced excalidraw source into dedicated whiteboard blocks', () => {
    const snapshot = '{ "store": {} }'
    const markdown = [
      '```excalidraw id="onboarding-flow"',
      snapshot,
      '```',
    ].join('\n')
    const preprocessed = preProcessExcalidrawMarkdown({ markdown })
    const blocks = [{
      type: 'paragraph',
      content: [{ type: 'text', text: preprocessed, styles: {} }],
      children: [],
    }]

    const [block] = injectExcalidrawInBlocks(blocks) as Array<{
      type: string
      props: { boardId: string; height: string; snapshot: string; width: string }
    }>

    expect(block.type).toBe(EXCALIDRAW_BLOCK_TYPE)
    expect(block.props.boardId).toBe('onboarding-flow')
    expect(block.props.height).toBe('520')
    expect(block.props.snapshot).toBe(snapshot)
    expect(block.props.width).toBe('')
  })

  it('reads persisted whiteboard dimensions from fence metadata', () => {
    const preprocessed = preProcessExcalidrawMarkdown({
      markdown: [
        '```excalidraw id="map" height="720" width="980"',
        '{}',
        '```',
      ].join('\n'),
    })

    const [block] = injectExcalidrawInBlocks([{
      type: 'paragraph',
      content: [{ type: 'text', text: preprocessed, styles: {} }],
      children: [],
    }]) as Array<{
      props: { height: string; width: string }
    }>

    expect(block.props.height).toBe('720')
    expect(block.props.width).toBe('980')
  })

  it('preserves ordinary and unclosed fences as normal Markdown', () => {
    const markdown = [
      '```ts',
      'const language = "excalidraw"',
      '```',
      '',
      '```excalidraw',
      '{ "store": {} }',
    ].join('\n')

    expect(preProcessExcalidrawMarkdown({ markdown })).toBe(markdown)
  })

  it('injects parsed excalidraw code blocks into dedicated whiteboard blocks', () => {
    const [block] = injectExcalidrawInBlocks([{
      type: 'codeBlock',
      props: { language: 'excalidraw' },
      content: [{ type: 'text', text: '{ "store": {} }', styles: {} }],
      children: [],
    }]) as Array<{
      type: string
      props: { height: string; snapshot: string; width: string }
    }>

    expect(block.type).toBe(EXCALIDRAW_BLOCK_TYPE)
    expect(block.props.height).toBe('520')
    expect(block.props.snapshot).toBe('{ "store": {} }')
    expect(block.props.width).toBe('')
  })

  it('keeps ordinary code blocks unchanged', () => {
    const [block] = injectExcalidrawInBlocks([{
      type: 'codeBlock',
      props: { language: 'json' },
      content: [{ type: 'text', text: '{ "store": {} }', styles: {} }],
      children: [],
    }]) as Array<{ type: string }>

    expect(block.type).toBe('codeBlock')
  })

  it('uses a longer fence when the board JSON contains backticks', () => {
    expect(excalidrawFenceSource({
      boardId: 'quoted',
      height: '640',
      snapshot: '{ "text": "```" }',
      width: '900',
    })).toBe([
      '````excalidraw id="quoted" height="640" width="900"',
      '{ "text": "```" }',
      '````',
    ].join('\n'))
  })
})
