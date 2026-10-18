import { vi } from 'vitest'
import type { NoteConversionPage, NoteConversionPreview, NoteConversionResult, NoteRecoveryView } from '../lib/learning/noteConversionTypes'
import type { NoteConversionApi } from '../components/learning/useNoteConversion'
export const memoryPageId = '00000000-0000-0000-0000-000000000002'
export const memoryCardId = '00000000-0000-0000-0000-000000000101'
export function noteMemoryFlowFixture() {
  const schedule = { state: 'review' as const, due: '2026-10-18T00:00:00Z', stability: 12, difficulty: 4, elapsedDays: 1, scheduledDays: 3, reps: 7, lapses: 2, lastReview: null, learningSteps: 0, engine: 'legacy-fsrs5' as const, revision: 0 }
  const card = { id: memoryCardId, pageId: memoryPageId, front: 'Old question', back: 'Old answer', answerMode: 'inline' as const, status: 'active' as const, position: 0, properties: { custom: false }, propertyDefinitions: {}, revision: 0, createdAt: 1, updatedAt: 1, schedule }
  const page: NoteConversionPage = { pageId: memoryPageId, path: 'lesson.md', title: 'Biology', sourceHash: 'a'.repeat(64), front: 'Article about cells\n', back: 'Mnemonic sketch\n', propertiesRaw: '---\ncustom: &value [false, null]\ncopy: *value\n---\n', config: null, classification: 'conflict', issues: [], candidates: [{ card, propertiesRaw: '{ "large":9007199254740993,"custom":false }', reviewCount: 8, undoneReviewCount: 1, storageFingerprint: 'b'.repeat(64) }], suggestedReuseCardId: null, pageStorageFingerprint: 'c'.repeat(64), sessionFingerprint: 'd'.repeat(64), activeSessionCount: 0, media: [], fingerprint: 'f'.repeat(64) }
  const preview: NoteConversionPreview = { version: 1, libraryId: 'library', schemaVersion: 5, state: 'ready', pages: [page], fingerprint: 'e'.repeat(64) }
  const result: NoteConversionResult = { cardId: memoryCardId, backupId: 'backup', retainedLegacyCards: 0, outcome: { operationId: 'operation', pageId: memoryPageId, status: 'committed', sourceHash: '0'.repeat(64), revision: 0, problem: null } }
  const recovery: NoteRecoveryView = { operationId: 'operation', pageId: memoryPageId, phase: 'conflict', draftSource: 'Saved draft\n', beforeSource: 'Original source\n', currentPath: 'lesson.md', currentSource: 'External source\n', currentHash: 'a'.repeat(64), sourceError: null, keptSource: null, outcome: null }
  const client = {
    vaultPath: '/qa', libraryId: 'library', previewNoteConversion: vi.fn().mockResolvedValue(preview), applyNoteConversion: vi.fn().mockResolvedValue(result), resumeNoteConversion: vi.fn().mockResolvedValue(result), noteConversionDetails: vi.fn().mockResolvedValue({ operationId: 'operation', pageId: memoryPageId, phase: 'applied', backupId: 'backup', cardId: memoryCardId, beforeSource: 'Before', afterSource: 'After', legacyCards: page.candidates }), noteCompatibility: vi.fn().mockResolvedValue(null), listNoteRecovery: vi.fn().mockResolvedValue([{ operationId: 'operation', pageId: memoryPageId, kind: 'convert', phase: 'conflict', createdAt: 1 }]), readNoteRecovery: vi.fn().mockResolvedValue(recovery), resolveNoteRecovery: vi.fn().mockResolvedValue({ ...result.outcome, status: 'discarded' }), resumeNoteMemory: vi.fn().mockResolvedValue(result.outcome),
  } satisfies NoteConversionApi
  return { client, page, preview, result, recovery }
}
