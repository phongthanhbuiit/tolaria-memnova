import { expect, type Page } from '@playwright/test'
import type { BlockNoteEditor } from '@blocknote/core'

// Tiptap exposes the editor on its DOM element for tests.
type RichEditorElement = HTMLElement & { editor?: BlockNoteEditor['_tiptapEditor'] }

export async function expectRichEditorCaret(page: Page, block: 'heading' | 'paragraph', atEnd = false): Promise<void> {
  await expect.poll(() => page.evaluate(({ block, atEnd }) => {
    const surface = document.querySelector<RichEditorElement>('.bn-editor[contenteditable="true"]')
    const selection = surface?.editor?.state.selection
    if (!surface || document.activeElement !== surface || !selection?.empty) return false

    const { $from } = selection
    return $from.parent.type.name === block && (!atEnd || $from.parentOffset === $from.parent.content.size)
  }, { block, atEnd }), { message: `Rich editor caret in ${block}${atEnd ? ' at end' : ''}` }).toBe(true)
}
