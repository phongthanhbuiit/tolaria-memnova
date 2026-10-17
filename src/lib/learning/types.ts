import type { FSRSCard } from '../fsrs'

export type LearningProperty = string | number | boolean | null | LearningProperty[] | { [key: string]: LearningProperty }

export interface LearningSchedule extends FSRSCard {
  learningSteps: number
  engine: 'legacy-fsrs5' | 'ts-fsrs@5.4.2'
  revision: number
}

export interface CardDraft {
  front: string
  back: string
  answerMode: 'inline' | 'page'
  status: 'draft' | 'active' | 'suspended' | 'trashed'
  position: number
  properties: Record<string, LearningProperty>
}

export interface LearningCard extends CardDraft {
  id: string
  pageId: string
  createdAt: number
  updatedAt: number
  revision: number
  schedule: LearningSchedule
}

export interface LibraryDescriptor {
  libraryId: string
  schemaVersion: 1 | 2
  migrationState?: 'legacy' | 'migrating' | 'ready'
}

export interface BackupDescriptor {
  id: string
  libraryId: string
  createdAt: number
  fileCount: number
  bytes: number
}

export interface MigrationIssue {
  path: string
  code: string
  severity: 'error' | 'warning'
  detail: string
}

export interface LegacyPagePreview {
  path: string
  title: string
  existingId: string | null
  fingerprint: string
  card: { draft: CardDraft; schedule: LearningSchedule } | null
}

export interface MigrationPreview {
  pageCount: number
  cardCount: number
  activeCards: number
  draftCards: number
  suspendedCards: number
  wholePageCards: number
  reviewCount: number
  unassignedReviewCount: number
  fingerprint: string
  issues: MigrationIssue[]
  pages: LegacyPagePreview[]
}

export interface MigrationProgress {
  state: 'legacy' | 'migrating' | 'ready'
  libraryId: string
  backupId: string | null
  totalPages: number
  importedPages: number
  totalCards: number
  importedCards: number
  importedReviews: number
}

export interface SessionScope { pageIds: string[] | null }
export interface StudyPage {
  id: string
  path: string
  title: string
  content: string
  fingerprint: string
}
export interface StudyItem {
  card: LearningCard
  page: StudyPage | null
  sourceError: string | null
}
export interface StudySession {
  id: string
  scope: SessionScope
  initialCount: number
  currentIndex: number
  status: 'active' | 'paused' | 'completed'
  revision: number
  updatedAt: number
  current: StudyItem | null
  waitingUntil: number | null
  completedCount: number
  reviewCount: number
  correctCount: number
  lastReviewId: string | null
  canUndo: boolean
}
export interface RateRequest {
  reviewId: string
  sessionId: string
  sessionRevision: number
  cardId: string
  cardRevision: number
  sourceFingerprint: string
  rating: 1 | 2 | 3 | 4
  durationMs: number
  reviewedAt: number
  schedule: LearningSchedule
}
export interface RateResult { session: StudySession; earnedXp: number; replayed: boolean }

export interface LearningPage {
  id: string
  path: string
  title: string
  available: boolean
  createdAt: number | null
  modifiedAt: number | null
}
