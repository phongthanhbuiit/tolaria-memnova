import { invoke } from '@tauri-apps/api/core'
import type { BackupDescriptor, CardDraft, LearningCard, LibraryDescriptor, MigrationPreview, MigrationProgress, SessionScope, StudySession, RateRequest, RateResult } from './types'

/** A connection is bound to both the validated folder and persistent UUID. */
export class LearningClient {
  readonly vaultPath: string
  readonly libraryId: string

  private constructor(vaultPath: string, libraryId: string) {
    this.vaultPath = vaultPath
    this.libraryId = libraryId
  }

  static previewMigration(vaultPath: string): Promise<MigrationPreview> {
    return invoke('learning_command', { vaultPath, libraryId: null, request: { kind: 'previewMigration' } })
  }

  static async connect(vaultPath: string): Promise<LearningClient> {
    const descriptor = await invoke<LibraryDescriptor>('learning_command', {
      vaultPath, libraryId: null, request: { kind: 'describe' },
    })
    if (!descriptor || ![1, 2].includes(descriptor.schemaVersion) || !descriptor.libraryId) {
      throw new Error('Unsupported learning database')
    }
    return new LearningClient(vaultPath, descriptor.libraryId)
  }

  private call<T>(request: Record<string, unknown>): Promise<T> {
    return invoke<T>('learning_command', { vaultPath: this.vaultPath, libraryId: this.libraryId, request })
  }

  migrationStatus(): Promise<MigrationProgress> {
    return this.call({ kind: 'migrationStatus' })
  }

  beginMigration(fingerprint: string, profileRaw: string | null): Promise<MigrationProgress> {
    return this.call({ kind: 'beginMigration', fingerprint, profileRaw })
  }

  resumeMigration(batchSize = 100): Promise<MigrationProgress> {
    return this.call({ kind: 'resumeMigration', batchSize })
  }

  startSession(scope: SessionScope = { pageIds: null }): Promise<StudySession> {
    return this.call({ kind: 'startSession', scope })
  }

  getSession(sessionId: string): Promise<StudySession> {
    return this.call({ kind: 'getSession', sessionId })
  }

  resumeSession(sessionId: string): Promise<StudySession> {
    return this.call({ kind: 'resumeSession', sessionId })
  }

  pauseSession(sessionId: string, revision: number): Promise<StudySession> {
    return this.call({ kind: 'pauseSession', sessionId, revision })
  }

  skipSessionCard(sessionId: string, revision: number): Promise<StudySession> {
    return this.call({ kind: 'skipSessionCard', sessionId, revision })
  }

  rateCard(review: RateRequest): Promise<RateResult> {
    return this.call({ kind: 'rateCard', review })
  }

  undoReview(sessionId: string, reviewId: string, revision: number): Promise<StudySession> {
    return this.call({ kind: 'undoReview', sessionId, reviewId, revision })
  }

  listCards(pageId: string | null = null, includeTrashed = false): Promise<LearningCard[]> {
    return this.call({ kind: 'listCards', pageId, includeTrashed })
  }

  createCard(pageId: string, draft: CardDraft): Promise<LearningCard> {
    return this.call({ kind: 'createCard', pageId, draft })
  }

  updateCard(cardId: string, revision: number, draft: CardDraft): Promise<LearningCard> {
    return this.call({ kind: 'updateCard', cardId, revision, draft })
  }

  cloneCard(cardId: string): Promise<LearningCard> {
    return this.call({ kind: 'cloneCard', cardId })
  }

  createBackup(): Promise<BackupDescriptor> {
    return this.call({ kind: 'createBackup' })
  }

  restoreBackup(backupId: string): Promise<{ path: string }> {
    return this.call({ kind: 'restoreBackup', backupId })
  }
}
