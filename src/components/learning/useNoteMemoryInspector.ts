import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLearningWorkspace } from './LearningContext'
import { parseNoteMemoryDocument } from '../../lib/learning/noteMemoryDocument'
import type { LearningClient } from '../../lib/learning/client'
import type { NoteMemoryView } from '../../lib/learning/types'
import type { NoteConversionDetails } from '../../lib/learning/noteConversionTypes'
import { joinVaultPath, notePathsMatch } from '../../utils/notePathIdentity'

type Snapshot =
  | {
      scope: object
      view: NoteMemoryView
      compatibility: NoteConversionDetails | null
    }
  | { scope: object; error: true }
async function loadSnapshot(
  client: LearningClient,
  root: string,
  path: string,
  pageId: string
) {
  const [view, compatibility] = await Promise.all([
    client.readNoteMemory(pageId),
    client.noteCompatibility(pageId),
  ])
  if (
    view.pageId !== pageId ||
    !notePathsMatch(joinVaultPath(root, view.path), path)
  )
    throw Error('note-inspector-identity-changed')
  if (
    compatibility &&
    (compatibility.pageId !== pageId ||
      compatibility.cardId !== view.binding?.cardId)
  )
    throw Error('note-inspector-compatibility-changed')
  return { view, compatibility }
}
/** Read only on note/Library/reconciliation changes, never on body keystrokes. */
export function useNoteMemoryInspector(path: string, content: string | null) {
  const workspace = useLearningWorkspace()
  const client = workspace?.phase === 'ready' ? workspace.client : null
  const root = workspace?.root ?? '',
    clock = workspace?.clock
  const parsed = useMemo(
    () => parseNoteMemoryDocument(content ?? ''),
    [content]
  )
  const pageId = parsed.pageId
  const configured =
    parsed.config !== null || /(?:^|\n)_memnova_learning_/.test(content ?? '')
  const [attempt, setAttempt] = useState(0)
  const [stored, setStored] = useState<Snapshot | null>(null)
  const scope = useMemo(
    () => ({ client, root, pageId, path, clock, attempt, configured }),
    [client, root, pageId, path, clock, attempt, configured]
  )
  const current = stored?.scope === scope ? stored : null
  useEffect(() => {
    if (!client || !pageId || !configured) return
    let cancelled = false
    void loadSnapshot(client, root, path, pageId)
      .then(
        (data) => ({ scope, ...data }),
        () => ({ scope, error: true as const })
      )
      .then((next) => {
        if (!cancelled) setStored(next)
      })
    return () => {
      cancelled = true
    }
  }, [client, pageId, configured, root, path, scope])
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  return { visible: configured && !!client && !!pageId, current, retry }
}
