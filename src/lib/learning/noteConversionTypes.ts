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

export type ConversionFaceChoice = { kind: 'markdown' } | { kind: 'card'; cardId: string }
export type ConversionBackChoice = { kind: 'inline'; source: ConversionFaceChoice } | { kind: 'page'; pageId: string; face: 'front' | 'back' }
export type ConversionMemoryChoice = { kind: 'reuse'; cardId: string; confirmedSameGoal: boolean } | { kind: 'fresh' }
export interface NoteConversionRequest {
  operationId: string
  pageId: string
  expectedFingerprint: string
  front: ConversionFaceChoice
  back: ConversionBackChoice
  memory: ConversionMemoryChoice
}
export interface NoteConversionResult {
  outcome: import('./types').NoteWriteOutcome
  backupId: string
  cardId: string
  retainedLegacyCards: number
}
export interface NoteConversionDetails {
  operationId: string
  pageId: string
  phase: 'prepared' | 'file_written' | 'applied' | 'conflict'
  backupId: string
  cardId: string
  beforeSource: string
  afterSource: string
  legacyCards: NoteConversionCandidate[]
}

export interface NoteRecoveryRequest { operationId: string; expectedCurrentHash: string | null; choice: 'keepDisk' }
export interface NoteRecoverySummary { operationId: string; pageId: string | null; kind: 'save' | 'configure' | 'convert' | 'reconcile'; phase: 'prepared' | 'file_written' | 'applied' | 'conflict'; createdAt: number }
export interface NoteRecoveryView {
  operationId: string; pageId: string; phase: NoteRecoverySummary['phase']; draftSource: string | null; beforeSource: string | null;
  currentPath: string | null; currentSource: string | null; currentHash: string | null; sourceError: string | null; keptSource: string | null; outcome: import('./types').NoteWriteOutcome | null
}
