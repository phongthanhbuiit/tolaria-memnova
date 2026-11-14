import { describe, expect, it, vi } from 'vitest'
import { EXCALIDRAW_BLOCK_TYPE } from '../utils/excalidrawMarkdown'
import {
  updateExcalidrawBlockPropsSafely,
  type ExcalidrawBlockMutationEditor,
} from './excalidrawBlockProps'

function excalidrawBlock(props: {
  boardId?: string
  height?: string
  id?: string
  snapshot?: string
  width?: string
}) {
  return {
    id: props.id ?? 'whiteboard-block',
    props: {
      boardId: props.boardId ?? 'planning-map',
      height: props.height ?? '520',
      snapshot: props.snapshot ?? '{}',
      width: props.width ?? '',
    },
    type: EXCALIDRAW_BLOCK_TYPE,
  }
}

describe('excalidraw block prop updates', () => {
  it('ignores whiteboard callbacks after the owning BlockNote block disappears', () => {
    const editor: ExcalidrawBlockMutationEditor = {
      getBlock: vi.fn(() => undefined),
      updateBlock: vi.fn(),
    }

    expect(updateExcalidrawBlockPropsSafely({
      blockId: 'whiteboard-block',
      editor,
      nextProps: (props) => ({ ...props, snapshot: '{ "store": {} }' }),
    })).toBe(false)
    expect(editor.updateBlock).not.toHaveBeenCalled()
  })

  it('resolves live whiteboard props before writing a debounced snapshot', () => {
    const editor: ExcalidrawBlockMutationEditor = {
      getBlock: vi.fn(() => excalidrawBlock({
        boardId: 'fresh-board',
        height: '640',
        snapshot: '{ "store": "old" }',
        width: '900',
      })),
      updateBlock: vi.fn(),
    }

    expect(updateExcalidrawBlockPropsSafely({
      blockId: 'whiteboard-block',
      editor,
      nextProps: (props) => ({ ...props, snapshot: '{ "store": "next" }' }),
    })).toBe(true)
    expect(editor.updateBlock).toHaveBeenCalledWith('whiteboard-block', {
      props: {
        boardId: 'fresh-board',
        height: '640',
        snapshot: '{ "store": "next" }',
        width: '900',
      },
      type: EXCALIDRAW_BLOCK_TYPE,
    })
  })

  it('turns a final missing-block race into a no-op', () => {
    const missingBlockError = new Error('Block with ID whiteboard-block not found')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const editor: ExcalidrawBlockMutationEditor = {
      getBlock: vi.fn(() => excalidrawBlock({})),
      updateBlock: vi.fn(() => {
        throw missingBlockError
      }),
    }

    expect(updateExcalidrawBlockPropsSafely({
      blockId: 'whiteboard-block',
      editor,
      nextProps: (props) => ({ ...props, height: '720' }),
    })).toBe(false)
    expect(warn).toHaveBeenCalledWith('[editor] Ignored stale whiteboard block update:', missingBlockError)

    warn.mockRestore()
  })
})
