import type { FSRSCard } from '../fsrs'
import type { VaultPropertyValue } from '../../types'

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
  properties: Record<string, VaultPropertyValue>
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
