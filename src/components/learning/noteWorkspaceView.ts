import { joinVaultPath, normalizeNotePathForIdentity, notePathsMatch } from '../../utils/notePathIdentity'
import type { LearningWorkspace } from './LearningContext'

/** The workspace already reconciles these summaries. Viewing a note must never register it. */
export function noteWorkspaceView(workspace: LearningWorkspace | null, path: string) {
  return workspace?.notes?.find(({ view }) => notePathsMatch(joinVaultPath(workspace.root, view.path), path))?.view
}

export function isLibraryNote(root: string, path: string) {
  return Boolean(root) && normalizeNotePathForIdentity(path).startsWith(`${normalizeNotePathForIdentity(root)}/`)
}

export function showsLearningTabs(workspace: LearningWorkspace | null, path: string, legacyEnabled: boolean) {
  if (!workspace || !isLibraryNote(workspace.root, path)) return false
  if (workspace.phase !== 'ready') return legacyEnabled
  if (!workspace.client?.supportsNoteMemory) return true // Independent-card clients create cards here.
  const view = noteWorkspaceView(workspace, path)
  return Boolean(view && (view.config?.enabled || view.legacyCardCount > 0 ||
    view.state === 'pending' || view.state === 'invalid' || view.state === 'conversionRequired'))
}
