import { renderHook, act } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { useRawModeWithFlush } from './useRawModeWithFlush'
import * as store from '../utils/vaultConfigStore'

const notePath = '/vault/project/test.md'
const originalContent = '# Test\n\nOriginal body\n'
const rawEditedContent = '# Test\n\nEdited in raw mode\n'

function makeEditor() {
  return {
    document: [],
    blocksToMarkdownLossy: vi.fn(() => originalContent),
  }
}

describe('useRawModeWithFlush', () => {
  beforeEach(() => {
    store.resetVaultConfigStore()
    store.bindVaultConfigStore(
      {
        zoom: null,
        view_mode: null,
        editor_mode: null,
        tag_colors: null,
        status_colors: null,
        property_display_modes: null,
      },
      vi.fn(),
    )
  })

  afterEach(() => {
    store.resetVaultConfigStore()
  })

  it('enters raw mode using the complete canonical document after flushing a projected face', async () => {
    const full = '# Article\n<!-- FLASHCARD:BACK -->\nMnemonic'
    let canonical = full
    const editor = makeEditor()
    editor.blocksToMarkdownLossy.mockReturnValue('Visible face only')
    const flush = { current: () => { canonical = full.replace('Article', 'Last stroke'); return true } }
    const { result } = renderHook(() => useRawModeWithFlush(editor as never, notePath, full, vi.fn(), undefined, flush, () => canonical))
    await act(async () => { await result.current.handleToggleRaw() })
    expect(result.current.rawModeContentOverride?.content).toBe('# Last stroke\n<!-- FLASHCARD:BACK -->\nMnemonic')
  })

  it('re-enters raw mode with pending raw edits while tab state is still stale', async () => {
    const onContentChange = vi.fn()
    const flushPendingEditorChangeRef = { current: vi.fn(() => false) }
    const editor = makeEditor()
    const { result } = renderHook(() => useRawModeWithFlush(
      editor as never,
      notePath,
      originalContent,
      onContentChange,
      undefined,
      flushPendingEditorChangeRef,
    ))

    await act(async () => {
      await result.current.handleToggleRaw()
    })
    act(() => {
      result.current.rawLatestContentRef.current = rawEditedContent
    })

    await act(async () => {
      await result.current.handleToggleRaw()
    })
    await act(async () => {
      await result.current.handleToggleRaw()
    })

    expect(onContentChange).toHaveBeenCalledWith(notePath, rawEditedContent)
    expect(result.current.rawLatestContentRef.current).toBe(rawEditedContent)
    expect(result.current.rawModeContentOverride).toEqual({
      path: notePath,
      content: rawEditedContent,
    })
  })
})
