import type { NoteConversionPreview, NoteConversionRequest, NoteConversionResult, NoteConversionDetails } from './noteConversionTypes'
import type { NoteFacePreview, NoteMemoryView, NoteWriteRequest, NoteConfigureRequest, NoteWriteOutcome } from './types'
import type { PropertyDefinitions } from './propertyValues'
import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../../mock-tauri'
import type { StudyStats } from '../../hooks/useStats'
import type { BackupCatalogEntry, BackupDescriptor, CardDraft, LearningCard, LibraryDescriptor, MigrationPreview, MigrationProgress, SessionScope, StudySession, StudyPage, RateRequest, RateResult, LearningPage } from './types'

function learningInvoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

/** A connection is bound to both the validated folder and persistent UUID. */
export class LearningClient {
  readonly vaultPath: string
  readonly libraryId: string

  private constructor(vaultPath: string, libraryId: string) {
    this.vaultPath = vaultPath
    this.libraryId = libraryId
  }

  static previewNoteConversion(vaultPath: string): Promise<NoteConversionPreview> {
    return learningInvoke('learning_command', { vaultPath, libraryId: null, request: { kind: 'previewNoteConversion' } })
  }
  previewNoteConversion(): Promise<NoteConversionPreview> { return this.call({ kind: 'previewNoteConversion' }) }

  static previewMigration(vaultPath: string): Promise<MigrationPreview> {
    return learningInvoke('learning_command', { vaultPath, libraryId: null, request: { kind: 'previewMigration' } })
  }

  static async connect(vaultPath: string): Promise<LearningClient> {
    const descriptor = await learningInvoke<LibraryDescriptor>('learning_command', {
      vaultPath, libraryId: null, request: { kind: 'describe' },
    })
    if (!descriptor || ![1, 2, 3, 4, 5].includes(descriptor.schemaVersion) || !descriptor.libraryId) {
      throw new Error('Unsupported learning database')
    }
    return new LearningClient(vaultPath, descriptor.libraryId)
  }

  private call<T>(request: Record<string, unknown>): Promise<T> {
    return learningInvoke<T>('learning_command', { vaultPath: this.vaultPath, libraryId: this.libraryId, request })
  }

  applyNoteConversion(request: NoteConversionRequest): Promise<NoteConversionResult> { return this.call({ kind: 'applyNoteConversion', request }) }
  resumeNoteConversion(operationId: string): Promise<NoteConversionResult> { return this.call({ kind: 'resumeNoteConversion', operationId }) }
  noteConversionDetails(operationId: string): Promise<NoteConversionDetails> { return this.call({ kind: 'noteConversionDetails', operationId }) }
  noteCompatibility(pageId: string): Promise<NoteConversionDetails | null> { return this.call({ kind: 'noteCompatibility', pageId }) }

  readNoteFace(pageId: string, face: import('./noteMemoryConfig').MemoryFace): Promise<NoteFacePreview> { return this.call({ kind: 'readNoteFace', pageId, face }) }
  readNoteMemory(pageId: string): Promise<NoteMemoryView> { return this.call({ kind: 'readNoteMemory', pageId }) }
  saveNoteMemory(request: NoteWriteRequest): Promise<NoteWriteOutcome> { return this.call({ kind: 'saveNoteMemory', request }) }
  configureNoteMemory(request: NoteConfigureRequest): Promise<NoteWriteOutcome> { return this.call({ kind: 'configureNoteMemory', request }) }
  reconcileNoteMemory(pageId: string): Promise<NoteMemoryView> { return this.call({ kind: 'reconcileNoteMemory', pageId }) }
  resumeNoteMemory(operationId: string): Promise<NoteWriteOutcome> { return this.call({ kind: 'resumeNoteMemory', operationId }) }

  pagePropertyDefinitions(pageId: string): Promise<PropertyDefinitions> { return this.call({ kind: 'pagePropertyDefinitions', pageId }) }
  setPagePropertyDefinitions(pageId: string, expected: PropertyDefinitions, definitions: PropertyDefinitions): Promise<PropertyDefinitions> { return this.call({ kind: 'setPagePropertyDefinitions', pageId, expected, definitions }) }

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

  readStudyPage(pageId: string): Promise<StudyPage> { return this.call({ kind: 'readStudyPage', pageId }) }
  listPages(): Promise<LearningPage[]> { return this.call({ kind: 'listPages' }) }
  syncPages(): Promise<LearningPage[]> { return this.call({ kind: 'syncPages' }) }
  ensurePage(path: string): Promise<LearningPage> { return this.call({ kind: 'ensurePage', path }) }
  studyStats(): Promise<StudyStats> { return this.call({ kind: 'studyStats' }) }
  setDailyGoal(goal: number): Promise<StudyStats> { return this.call({ kind: 'setDailyGoal', goal }) }

  listCards(pageId: string | null = null, includeTrashed = false): Promise<LearningCard[]> {
    return this.call({ kind: 'listCards', pageId, includeTrashed })
  }

  createCard(pageId: string, draft: CardDraft, operationId: string | null = null): Promise<LearningCard> {
    return this.call({ kind: 'createCard', pageId, draft, operationId })
  }

  updateCard(cardId: string, revision: number, draft: CardDraft): Promise<LearningCard> {
    return this.call({ kind: 'updateCard', cardId, revision, draft })
  }

  cloneCard(cardId: string): Promise<LearningCard> {
    return this.call({ kind: 'cloneCard', cardId })
  }

  listBackups(): Promise<BackupCatalogEntry[]> { return this.call({ kind: 'listBackups' }) }
  verifyBackup(backupId: string): Promise<BackupDescriptor> { return this.call({ kind: 'verifyBackup', backupId }) }

  createBackup(): Promise<BackupDescriptor> {
    return this.call({ kind: 'createBackup' })
  }

  restoreBackup(backupId: string): Promise<{ path: string }> {
    return this.call({ kind: 'restoreBackup', backupId })
  }
}
