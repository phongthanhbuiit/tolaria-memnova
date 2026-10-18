import { useEffect, useMemo, useState } from 'react'
import { joinVaultPath, notePathsMatch } from '../../utils/notePathIdentity'
import type { LearningClient } from '../../lib/learning/client'
import type { MemoryFace } from '../../lib/learning/noteMemoryConfig'
import type { NoteSourcePreview } from '../../lib/learning/types'

interface SourcePreviewOptions {
  client: Pick<LearningClient, 'vaultPath' | 'previewNoteSource'> | null
  path: string | null
  face: MemoryFace
  open: boolean
  ownerPath?: string
  ownerPageId?: string | null
}
type PreviewRead = {
  scope: object
  preview: NoteSourcePreview | null
  error: string | null
}
export function useSourcePreview(options: SourcePreviewOptions) {
  const { client, path, face, open, ownerPath, ownerPageId } = options
  const [attempt, setAttempt] = useState(0)
  const scope = useMemo(
    () => ({ client, path, face, open, ownerPath, ownerPageId, attempt }),
    [client, path, face, open, ownerPath, ownerPageId, attempt]
  )
  const [read, setRead] = useState<PreviewRead | null>(null)
  const current = read?.scope === scope ? read : null
  useEffect(() => {
    if (!client || !path || !open) return
    let active = true
    const load = async () => {
      try {
        if (
          ownerPath &&
          notePathsMatch(joinVaultPath(client.vaultPath, path), ownerPath)
        )
          throw Error('self-source')
        const preview = await client.previewNoteSource(path, face)
        if (preview.path !== path || preview.face !== face)
          throw Error('invalid-source-preview')
        if (ownerPageId && preview.pageId === ownerPageId)
          throw Error('self-source')
        if (active) setRead({ scope, preview, error: null })
      } catch (error) {
        if (active) setRead({ scope, preview: null, error: String(error) })
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [client, path, face, open, ownerPath, ownerPageId, scope])
  return {
    preview: current?.preview ?? null,
    error: current?.error ?? null,
    busy: Boolean(open && client && path && !current),
    reload: () => setAttempt((value) => value + 1),
  }
}
