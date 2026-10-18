import type { VaultEntry } from '../../types'
import { createContext, useContext } from 'react'
import type { useLearningLibrary } from '../../hooks/useLearningLibrary'
import type { useLearningStudy } from '../../hooks/useLearningStudy'
import type { StudyLane } from '../../lib/learning/types'
export type LearningWorkspace = ReturnType<typeof useLearningLibrary> & { entries?: VaultEntry[]; study: ReturnType<typeof useLearningStudy>; requestStudy: (pageIds?: string[], lane?: StudyLane) => void; setNoteEnabled: (path: string, enabled: boolean) => Promise<void>; flush: () => Promise<unknown>; refreshSources?: () => Promise<unknown>; scopeForPage: (pageId: string) => string[]; openLibrary: (path: string) => Promise<unknown> }
export const LearningContext = createContext<LearningWorkspace | null>(null)
export const useLearningWorkspace = () => useContext(LearningContext)
