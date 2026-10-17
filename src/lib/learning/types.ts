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
  schemaVersion: 1
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
  fingerprint: string
  issues: MigrationIssue[]
  pages: LegacyPagePreview[]
}
