import type { MutableRefObject } from 'react'
import type { useCreateBlockNote } from '@blocknote/react'
import { HistoryExtension } from '@blocknote/core/extensions'
import { blankParagraphBlocks } from './editorTabContent'
import { EDITOR_CONTAINER_SELECTOR } from './editorDomSelection'
import { resetTextSelectionBeforeContentSwap } from './editorTiptapSelection'
import { repairMalformedEditorBlocks } from './editorBlockRepair'

type EditorBlocks = unknown[]

export type EditorContentPathRef = MutableRefObject<string | null>

interface AppliedEditorContentCommit {
  editor: ReturnType<typeof useCreateBlockNote>
  editorContentPathRef: EditorContentPathRef
  scrollTop: number
  suppressChangeRef: MutableRefObject<boolean>
  targetPath: string
}

interface ApplyBlocksToEditorOptions extends AppliedEditorContentCommit {
  blocks: EditorBlocks
}

type ApplyBlankStateToEditorOptions = Omit<AppliedEditorContentCommit, 'scrollTop'>

interface ApplyMarkupStateToEditorOptions extends Omit<AppliedEditorContentCommit, 'scrollTop'> {
  markup: string
}

export function applyBlocksToEditor(options: ApplyBlocksToEditorOptions): boolean {
  const {
    editor,
    blocks,
    suppressChangeRef,
  } = options
  const safeBlocks = repairMalformedEditorBlocks(blocks)
  suppressChangeRef.current = true
  try {
    resetTextSelectionBeforeContentSwap(editor)
    const current = editor.document
    if (current.length > 0 && safeBlocks.length > 0) {
      editor.replaceBlocks(current, safeBlocks)
    } else if (safeBlocks.length > 0) {
      editor.insertBlocks(safeBlocks, current[0], 'before')
    }
  } catch (err) {
    console.error('applyBlocks failed, trying fallback:', err)
    try {
      const markup = editor.blocksToHTMLLossy(safeBlocks)
      editor._tiptapEditor.commands.setContent(markup)
    } catch (err2) {
      console.error('Fallback also failed:', err2)
      suppressChangeRef.current = false
      return false
    }
  }

  commitAppliedEditorContent(options)
  return true
}

export function applyBlankStateToEditor(options: ApplyBlankStateToEditorOptions): boolean {
  return applyBlocksToEditor({ ...options, blocks: blankParagraphBlocks(), scrollTop: 0 })
}

export function applyHtmlStateToEditor(options: ApplyMarkupStateToEditorOptions) {
  const {
    editor,
    markup,
    suppressChangeRef,
  } = options
  suppressChangeRef.current = true
  try {
    resetTextSelectionBeforeContentSwap(editor)
    editor._tiptapEditor.commands.setContent(markup)
  } catch (err) {
    console.error('applyHtmlStateToEditor failed:', err)
    suppressChangeRef.current = false
    throw err
  }

  commitAppliedEditorContent({ ...options, scrollTop: 0 })
}

function commitAppliedEditorContent(options: AppliedEditorContentCommit) {
  const {
    editorContentPathRef,
    scrollTop,
    suppressChangeRef,
    targetPath,
  } = options

  resetLoadedDocumentHistory(options.editor)
  requestNextFrame(() => {
    editorContentPathRef.current = targetPath
    suppressChangeRef.current = false
    const scrollEl = typeof document === 'undefined' ? null : document.querySelector(EDITOR_CONTAINER_SELECTOR)
    if (scrollEl) scrollEl.scrollTop = scrollTop
  })
}

/** A document replacement is a load boundary, never an edit of the previous note/face. */
function resetLoadedDocumentHistory(editor: ReturnType<typeof useCreateBlockNote>) {
  const history = editor.getExtension?.(HistoryExtension)
  if (!history) return
  const state = editor.prosemirrorState
  const historyPlugins = new Set<object>(history.prosemirrorPlugins)
  // Reconfigure only history's state field. Keep the document, selection and all other
  // plugin states intact, and update the view once so mounted node views stay alive.
  const withoutHistory = state.reconfigure({ plugins: state.plugins.filter((plugin: object) => !historyPlugins.has(plugin)) })
  editor.prosemirrorView.updateState(withoutHistory.reconfigure({ plugins: state.plugins }))
}

function requestNextFrame(callback: FrameRequestCallback): void {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback)
    return
  }

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback)
    return
  }

  setTimeout(() => callback(Date.now()), 0)
}
