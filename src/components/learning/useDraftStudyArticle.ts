import { useEffect, useState } from 'react'
import type { NoteFacePreview } from '../../lib/learning/types'
import { useLearningWorkspace } from './LearningContext'

export function useDraftStudyArticle(pageId: string | undefined, snapshotKey: string) {
  const client = useLearningWorkspace()?.client
  const [result, setResult] = useState<{ key: string; article: NoteFacePreview } | null>(null)
  useEffect(() => {
    if (!client || !pageId) return
    let current = true
    void client.readNoteFace(pageId, 'front').then(article => {
      if (current) setResult({ key: snapshotKey, article })
    }, () => {})
    return () => { current = false }
  }, [client, pageId, snapshotKey])
  return pageId && result?.key === snapshotKey ? result.article : null
}
