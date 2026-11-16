import { useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke, updateMockContent } from '../mock-tauri'
import { cacheNoteContent } from './useTabManagement'
import { saveThroughNoteEditor } from '../lib/learning/noteEditorPersistence'

export async function persistContent(path: string, content: string): Promise<void> {
  if (await saveThroughNoteEditor(path, content)) return
  if (/(?:^|\n)_memnova_learning_/.test(content)) {
    // Configuration receipts can leave an already committed source queued when
    // navigation unmounts its canonical writer. Only exact disk equality makes
    // that retry a no-op. A genuine draft still requires the scoped writer.
    const saved = isTauri()
      ? await invoke<string>('get_note_content', { path })
      : await mockInvoke<string>('get_note_content', { path })
    if (saved === content) return
    throw Error('note-editor-persistence-unavailable')
  }
  if (isTauri()) {
    await invoke('save_note_content', { path, content })
  } else {
    await mockInvoke('save_note_content', { path, content })
  }
}

/**
 * Hook that provides an explicit save function for note content.
 * Called on Cmd+S — no debounce, no auto-save.
 *
 * @param updateContent - callback to also update in-memory state after save
 */
export function useSaveNote(updateContent: (path: string, content: string) => void) {
  const saveNote = useCallback(async (path: string, content: string) => {
    await persistContent(path, content)
    cacheNoteContent(path, content)
    if (!isTauri()) {
      updateMockContent(path, content)
    }
    updateContent(path, content)
  }, [updateContent])

  return { saveNote }
}
