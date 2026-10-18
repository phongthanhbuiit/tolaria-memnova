import type { LearningCard, NoteMediaDependency } from './types'
import type { NoteMemoryConfig } from './noteMemoryConfig'

export interface NoteConversionCandidate {
  card: LearningCard
  propertiesRaw: string
  reviewCount: number
  undoneReviewCount: number
  storageFingerprint: string
}
export type NoteConversionClassification = 'ordinary' | 'legacyMarkdown' | 'matching' | 'conflict' | 'multiple' | 'wholePage' | 'trashed' | 'invalid' | 'bound' | 'pending'
export interface NoteConversionPage {
  pageId: string | null
  path: string
  title: string
  sourceHash: string | null
  front: string
  back: string | null
  propertiesRaw: string
  config: NoteMemoryConfig | null
  classification: NoteConversionClassification
  issues: string[]
  candidates: NoteConversionCandidate[]
  suggestedReuseCardId: string | null
  pageStorageFingerprint: string
  sessionFingerprint: string
  activeSessionCount: number
  media: NoteMediaDependency[]
  fingerprint: string
}
export interface NoteConversionPreview {
  version: 1
  libraryId: string | null
  schemaVersion: number | null
  state: 'ready' | 'importRequired' | 'upgradeRequired' | 'recoveryRequired'
  pages: NoteConversionPage[]
  fingerprint: string
}
