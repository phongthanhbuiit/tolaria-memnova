import { useCallback, useMemo } from 'react'
import { notePathsForCards, studyScopeForWorkspace, workspaceDue, type ResolveViewStudyScope } from '../lib/learning/noteWorkspace'
import type { ReviewPresentation } from '../lib/learning/flashcardStudyMode'
import type { StudyLane } from '../lib/learning/types'
import { trackEvent } from '../lib/telemetry'
import type { useLearningLibrary } from './useLearningLibrary'
import { useLearningStudy } from './useLearningStudy'

interface StudyRequestOptions {
  learning: ReturnType<typeof useLearningLibrary>
  activePath?: string
  savedViewOpen: boolean
  flushEditor: (path: string) => Promise<void>
  onError: (message: string) => void
}

export function useWorkspaceStudyRequests({ learning, activePath, savedViewOpen, flushEditor, onError }: StudyRequestOptions) {
  const { pages, notes, cards, clock, root, client, phase, openMigration, refresh, refreshSnapshot } = learning
  const study = useLearningStudy(client, refresh)
  const { start } = study
  const supportsNotes = Boolean(client?.supportsNoteMemory)
  const requestStudy = useCallback(async (scope?: string[] | ResolveViewStudyScope, lane?: StudyLane, presentation?: ReviewPresentation) => {
    if (phase !== 'ready') { await openMigration(); return }
    try {
      if (activePath) await flushEditor(activePath)
      let pageIds: string[] | undefined
      if (typeof scope === 'function') {
        const snapshot = await refreshSnapshot()
        if (!snapshot) return
        const due = workspaceDue(snapshot.pages, snapshot.notes, snapshot.cards, snapshot.clock)
        // The scheduler selects due cards. Keep its scope stable as grading moves due dates.
        pageIds = scope(notePathsForCards(root, snapshot.pages, due.readyNotes))
        const dueIds = new Set(due.notes.map(card => card.pageId))
        const dueCount = pageIds.filter(id => dueIds.has(id)).length
        if (!dueCount) return
        trackEvent('memnova_saved_view_study_requested', { due_count: dueCount })
      } else {
        await refresh()
        pageIds = scope
      }
      await start(studyScopeForWorkspace(supportsNotes, pageIds, lane), presentation)
    } catch (error) {
      onError(String(error))
    }
  }, [phase, openMigration, activePath, flushEditor, refreshSnapshot, root, refresh, start, supportsNotes, onError])

  const due = useMemo(() => workspaceDue(pages, notes, cards, clock), [pages, notes, cards, clock])
  const savedViewStudy = useMemo(() => {
    if (!savedViewOpen || phase !== 'ready' || !supportsNotes) return undefined
    return {
      root,
      dueByPath: notePathsForCards(root, pages, due.notes),
      start: (resolve: ResolveViewStudyScope) => requestStudy(resolve, 'notes'),
    }
  }, [savedViewOpen, phase, supportsNotes, root, pages, due.notes, requestStudy])
  const reviewCount = supportsNotes ? due.notes.length : due.legacy.length
  return { study, requestStudy, savedViewStudy, reviewCount }
}
