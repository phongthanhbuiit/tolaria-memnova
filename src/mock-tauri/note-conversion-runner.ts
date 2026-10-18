/** Text-only QA model. Native tests establish SQLite, backup and media durability. */
import type { Context, Fixture } from './learning'
import type { LearningCard, LearningSchedule, NoteFacePreview, NoteWriteOutcome } from '../lib/learning/types'
import type { ConversionFaceChoice, NoteConversionDetails, NoteConversionPage, NoteConversionRequest, NoteConversionResult } from '../lib/learning/noteConversionTypes'
import { parseNoteConversionRequest } from '../lib/learning/noteConversionRequest'
import { parseNoteMemoryDocument } from '../lib/learning/noteMemoryDocument'
import { patchNoteMemoryConfig, patchNoteMemoryFace } from '../lib/learning/noteMemoryPatch'
import { usefulMemoryContent } from '../lib/learning/noteMemoryReadiness'
import { mockNoteConversionPreview } from './note-conversion'
import { createMockLearningBackup } from './learning-backup'
import { mockNoteFace, mockNotePath, type FixtureNoteOperation } from './note-memory'

export interface FixtureConversionIntent { request: NoteConversionRequest; beforePage: NoteConversionPage; beforeSource: string; afterSource: string; backupId: string; schedule: LearningSchedule; linked: NoteFacePreview | null; ready: boolean }
type Environment = { data: Fixture; root: string; context: Context; fresh: () => LearningSchedule; hash: (value: string) => Promise<string>; persist: () => void }
const kinds = new Set(['applyNoteConversion', 'resumeNoteConversion', 'noteConversionDetails', 'noteCompatibility'])
export const isMockConversionRequest = (kind: unknown) => typeof kind === 'string' && kinds.has(kind)
function legacyCard(page: NoteConversionPage, id: string): LearningCard {
  const card = page.candidates.find(candidate => candidate.card.id === id && candidate.card.status !== 'trashed')?.card
  if (!card) throw Error('invalid-conversion-card-choice')
  return card
}
function face(page: NoteConversionPage, choice: ConversionFaceChoice, reverse: boolean): string {
  if (choice.kind === 'markdown') return reverse ? page.back ?? '' : page.front
  const card = legacyCard(page, choice.cardId)
  if (reverse && card.answerMode !== 'inline') throw Error('choose-explicit-whole-page-mnemonic')
  return reverse ? card.back : card.front
}
function projectedSource(raw: string, page: NoteConversionPage, request: NoteConversionRequest): string {
  if (request.back.kind === 'page' && request.back.pageId === request.pageId) throw Error('self-source')
  const back = request.back.kind === 'page' ? request.back : { kind: 'inline' as const }
  let source = patchNoteMemoryConfig(raw, { version: 1, enabled: true, back })
  source = patchNoteMemoryFace(source, 'front', face(page, request.front, false))
  if (request.back.kind === 'inline') source = patchNoteMemoryFace(source, 'back', face(page, request.back.source, true), true)
  return source
}
function result(op: FixtureNoteOperation, outcome: NoteWriteOutcome): NoteConversionResult {
  const intent = conversion(op)
  return { outcome, backupId: intent.backupId, cardId: op.cardId, retainedLegacyCards: intent.beforePage.candidates.length - Number(intent.request.memory.kind === 'reuse') }
}
function conversion(op: FixtureNoteOperation): FixtureConversionIntent { if (op.kind !== 'convert' || !op.conversion) throw Error('not-a-conversion-operation'); return op.conversion }
function operation(env: Environment, id: string): FixtureNoteOperation { const op = env.data.noteMemory?.operations[id]; if (!op) throw Error('missing-conversion-operation'); conversion(op); return op }
function outcome(op: FixtureNoteOperation, status: NoteWriteOutcome['status'], problem: string | null): NoteWriteOutcome { return { operationId: op.operationId, pageId: op.pageId, status, sourceHash: op.afterHash, revision: status === 'committed' ? 0 : null, problem } }
function conflict(env: Environment, op: FixtureNoteOperation, problem: string): NoteConversionResult { op.phase = 'conflict'; env.persist(); return result(op, outcome(op, 'conflict', problem)) }
async function linked(env: Environment, request: NoteConversionRequest): Promise<NoteFacePreview | null> { return request.back.kind === 'page' ? mockNoteFace(env, request.back.pageId, request.back.face) : null }
async function unchangedInputs(env: Environment, op: FixtureNoteOperation): Promise<boolean> {
  const intent = conversion(op)
  const preview = await mockNoteConversionPreview(env.root, env.data, env.context, env.hash)
  const current = preview.pages.find(page => page.path === intent.beforePage.path)
  if (!current || current.issues.length || current.activeSessionCount || current.pageStorageFingerprint !== intent.beforePage.pageStorageFingerprint || current.sessionFingerprint !== intent.beforePage.sessionFingerprint) return false
  if (JSON.stringify(current.candidates.map(card => card.storageFingerprint)) !== JSON.stringify(intent.beforePage.candidates.map(card => card.storageFingerprint))) return false
  try { return JSON.stringify(await linked(env, intent.request)) === JSON.stringify(intent.linked) } catch { return false }
}
function complete(env: Environment, op: FixtureNoteOperation): void {
  const intent = conversion(op)
  const status = intent.ready ? 'active' : 'draft'
  if (intent.request.memory.kind === 'reuse') {
    const card = env.data.cards.find(card => card.id === op.cardId)
    if (!card || card.revision >= 4294967295) throw Error('conversion-card-changed')
    card.status = status; card.revision++; card.updatedAt = op.createdAt
  } else {
    env.data.cards.push({ id: op.cardId, pageId: op.pageId, front: '', back: '', answerMode: 'inline', status, position: 0, properties: {}, propertyDefinitions: {}, revision: 0, createdAt: op.createdAt, updatedAt: op.createdAt, schedule: structuredClone(intent.schedule) })
  }
  if (!env.data.noteMemory) throw Error('missing-conversion-journal')
  env.data.noteMemory.bindings[op.pageId] = { pageId: op.pageId, cardId: op.cardId, sourceHash: op.afterHash, revision: 0 }
  op.outcome = outcome(op, 'committed', null); op.phase = 'applied'; env.persist()
}
async function resume(env: Environment, op: FixtureNoteOperation): Promise<NoteConversionResult> {
  if (op.outcome) return result(op, op.outcome)
  const intent = conversion(op)
  if (!env.data.backups?.some(backup => backup.descriptor.id === intent.backupId)) throw Error('missing-conversion-backup')
  let raw: string
  try { raw = env.data.restoredFiles?.[intent.beforePage.path] ?? await env.context.read(mockNotePath(env.root, intent.beforePage.path)) } catch { return conflict(env, op, 'missing-source') }
  const hash = await env.hash(raw)
  if (hash !== op.beforeHash && hash !== op.afterHash) return conflict(env, op, 'changed-source')
  if (!await unchangedInputs(env, op)) return conflict(env, op, 'conversion-inputs-changed')
  if (hash !== op.afterHash) {
    try {
      if (!env.context.write) throw Error('source-writer-unavailable')
      await env.context.write(mockNotePath(env.root, intent.beforePage.path), intent.afterSource)
      if (env.data.restoredFiles) env.data.restoredFiles[intent.beforePage.path] = intent.afterSource
    } catch (error) { env.persist(); return result(op, outcome(op, 'pending', String(error))) }
  }
  op.phase = 'file_written'; env.persist()
  if (!await unchangedInputs(env, op)) return conflict(env, op, 'conversion-inputs-changed')
  try {
    const latest = env.data.restoredFiles?.[intent.beforePage.path] ?? await env.context.read(mockNotePath(env.root, intent.beforePage.path))
    if (await env.hash(latest) !== op.afterHash) return conflict(env, op, 'changed-source-before-completion')
  } catch { return conflict(env, op, 'missing-source-before-completion') }
  complete(env, op)
  return result(op, op.outcome ?? outcome(op, 'pending', 'missing-receipt'))
}
async function apply(env: Environment, value: unknown): Promise<NoteConversionResult> {
  const request = parseNoteConversionRequest(value)
  const requestHash = await env.hash(JSON.stringify(request))
  const old = env.data.noteMemory?.operations[request.operationId]
  if (old) { if (old.kind !== 'convert' || old.requestHash !== requestHash) throw Error('different-conversion-intent'); return resume(env, old) }
  const preview = await mockNoteConversionPreview(env.root, env.data, env.context, env.hash)
  const page = preview.pages.find(page => page.pageId === request.pageId)
  if (!page || page.fingerprint !== request.expectedFingerprint || page.activeSessionCount || !['matching','conflict','multiple','wholePage','trashed','legacyMarkdown'].includes(page.classification)) throw Error('conversion-preview-changed')
  const raw = env.data.restoredFiles?.[page.path] ?? await env.context.read(mockNotePath(env.root, page.path))
  const after = projectedSource(raw, page, request)
  const source = await linked(env, request)
  const document = parseNoteMemoryDocument(after)
  const frontReady = usefulMemoryContent(document.front), backReady = usefulMemoryContent(source?.content ?? document.back)
  const oldCard = request.memory.kind === 'reuse' ? legacyCard(page, request.memory.cardId) : null
  const cardId = oldCard?.id ?? crypto.randomUUID()
  const schedule = structuredClone(oldCard?.schedule ?? env.fresh())
  const backup = await createMockLearningBackup(env.data, env.root, env.context)
  const intent: FixtureConversionIntent = { request, beforePage: page, beforeSource: raw, afterSource: after, backupId: backup.id, schedule, linked: source, ready: frontReady && backReady }
  const op: FixtureNoteOperation = { operationId: request.operationId, pageId: request.pageId, kind: 'convert', phase: 'prepared', requestHash, beforeHash: page.sourceHash ?? '', afterHash: await env.hash(after), expectedRevision: null, source: after, cardId, outcome: null, createdAt: Date.now(), conversion: intent }
  ;(env.data.noteMemory ??= { bindings: {}, operations: {} }).operations[op.operationId] = op
  env.persist()
  return resume(env, op)
}
function details(op: FixtureNoteOperation): NoteConversionDetails {
  const intent = conversion(op)
  return { operationId: op.operationId, pageId: op.pageId, phase: op.phase, backupId: intent.backupId, cardId: op.cardId, beforeSource: intent.beforeSource, afterSource: intent.afterSource, legacyCards: structuredClone(intent.beforePage.candidates) }
}
export async function mockConversionCommand(env: Environment, request: Record<string, unknown>): Promise<unknown> {
  const field = request.kind === 'applyNoteConversion' ? 'request' : request.kind === 'noteCompatibility' ? 'pageId' : 'operationId'
  if (Object.keys(request).some(key => !['kind', field].includes(key)) || !Object.hasOwn(request, field)) throw Error('invalid-conversion-fields')
  switch (request.kind) {
    case 'applyNoteConversion': return apply(env, request.request)
    case 'resumeNoteConversion': return resume(env, operation(env, String(request.operationId)))
    case 'resumeNoteMemory': return (await resume(env, operation(env, String(request.operationId)))).outcome
    case 'noteConversionDetails': return details(operation(env, String(request.operationId)))
    case 'noteCompatibility': {
      const pageId = String(request.pageId), binding = env.data.noteMemory?.bindings[pageId]
      if (!binding) return null
      const op = Object.values(env.data.noteMemory?.operations ?? {}).filter(op => op.kind === 'convert' && op.pageId === pageId && op.phase === 'applied' && op.cardId === binding.cardId).sort((a,b) => b.createdAt - a.createdAt)[0]
      return op ? details(op) : null
    }
    default: throw Error('invalid-conversion-routing')
  }
}
