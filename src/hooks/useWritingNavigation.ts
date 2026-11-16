import { useCallback } from 'react'
import type { SidebarSelection, VaultEntry } from '../types'
import type { LearningPage } from '../lib/learning/types'
import { findByNotePath, joinVaultPath, notePathsMatch } from '../utils/notePathIdentity'
import type { useNoteActions } from './useNoteActions'
import type { ImmediateCreateOptions } from './useNoteCreation'
import type { ViewMode } from './useViewMode'

type NoteActions = Pick<ReturnType<typeof useNoteActions>,
  'activeTabPathRef' | 'handleSelectNote' | 'handleCreateNote' | 'handleCreateNoteImmediate'>

interface Navigation {
  notes: NoteActions
  selection: SidebarSelection
  select: (selection: SidebarSelection) => void
  noteListVisible: boolean
  setViewMode: (mode: ViewMode) => void
  entries: VaultEntry[]
  root: string
}

function dashboard(selection: SidebarSelection): 'home' | 'decks' | null {
  if (selection.kind !== 'filter') return null
  if (selection.filter === 'decks') return 'decks'
  return selection.filter === 'home' || selection.filter === 'review' ? 'home' : null
}

/** Opening a tab must reveal its editor when a full-width learning dashboard is in front. */
export function useWritingNavigation({ notes, selection, select, noteListVisible, setViewMode, entries, root }: Navigation) {
  const mode = dashboard(selection)
  const revealEditor = useCallback(() => {
    if (mode) select({ kind: 'filter', filter: 'all' })
  }, [mode, select])
  const { handleCreateNoteImmediate, handleSelectNote, activeTabPathRef } = notes
  const createInEditor = useCallback((type?: string, options?: ImmediateCreateOptions) => {
    revealEditor()
    handleCreateNoteImmediate(type, options)
  }, [handleCreateNoteImmediate, revealEditor])
  const openEntry = async (entry: VaultEntry) => {
    await handleSelectNote(entry)
    if (notePathsMatch(activeTabPathRef.current, entry.path)) revealEditor()
  }
  return {
    mode, createInEditor, openEntry,
    createFromLibrary: () => createInEditor(undefined, { creationPath: 'library' }),
    createFromEmptyEditor: () => handleCreateNoteImmediate(undefined, { creationPath: 'empty_editor' }),
    createFromQuickOpen: async (title: string) => {
      const created = await notes.handleCreateNote(title, 'Note', 'quick_open')
      if (created) revealEditor()
      return created
    },
    browseAll: () => {
      select({ kind: 'filter', filter: 'all' })
      if (!noteListVisible) setViewMode('editor-list')
    },
    openLearningPage: (page: LearningPage) => {
      const path = joinVaultPath(root, page.path)
      const entry = findByNotePath(entries, path)
      if (entry) void openEntry(entry)
    },
  }
}
