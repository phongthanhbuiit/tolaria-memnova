import type { FixtureNoteResolution } from './note-recovery'
import type { FixtureConversionIntent } from './note-conversion-runner'
/** Browser QA model of the note IPC contract. This is not native persistence evidence. */
import type { Context, Fixture } from './learning'
import type { LearningCard, LearningSchedule, NoteBinding, NoteConfigureRequest, NoteMemoryView, NoteWriteOutcome, NoteWriteRequest, NoteFacePreview, StudyItem } from '../lib/learning/types'
import type { NoteMemoryConfig } from '../lib/learning/noteMemoryConfig'
import { parseNoteMemoryDocument } from '../lib/learning/noteMemoryDocument'
import { patchNoteMemoryConfig } from '../lib/learning/noteMemoryPatch'
import { memoryHeader, memoryLines } from '../lib/learning/noteMemoryLines'
import { usefulMemoryContent } from '../lib/learning/noteMemoryReadiness'

export type FixtureNoteOperation = {
  operationId: string; pageId: string; kind: 'save' | 'configure' | 'convert'; phase: 'prepared' | 'file_written' | 'applied' | 'conflict'
  requestHash: string; beforeHash: string; afterHash: string; expectedRevision: number | null
  resolution?: FixtureNoteResolution
  conversion?: FixtureConversionIntent
  source: string | null; cardId: string; outcome: NoteWriteOutcome | null; createdAt: number
}
type Operation = FixtureNoteOperation
export interface FixtureNoteMemory { bindings: Record<string, NoteBinding>; operations: Record<string, Operation> }
type Environment = { data: Fixture; root: string; context: Context; fresh: () => LearningSchedule; hash: (value: string) => Promise<string>; persist: () => void }
type ReadEnvironment = Pick<Environment, 'data' | 'root' | 'context' | 'hash'>
const noteKinds = new Set(['readNoteFace', 'readNoteMemory', 'saveNoteMemory', 'configureNoteMemory', 'reconcileNoteMemory', 'resumeNoteMemory'])
export const isNoteMemoryRequest = (kind: unknown): boolean => typeof kind === 'string' && noteKinds.has(kind)
export const hasMockPendingNote = (data: Fixture, pageId: string): boolean => Object.values(data.noteMemory?.operations ?? {}).some(op => op.pageId === pageId && op.phase !== 'applied')
export const isMockBoundCard = (data: Fixture, id: string): boolean => Object.values(data.noteMemory?.bindings ?? {}).some(binding => binding.cardId === id)
export function mockNotePath(root: string, path: string): string {
  if (!path || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..' || ['.memnova', '.git'].includes(part)) || !/\.m(?:d|arkdown)$/i.test(path)) throw Error('Invalid Library note path')
  return `${root}/${path}`
}
export function withMockNoteIdentity(source: string, id: string): string {
  const document = parseNoteMemoryDocument(source)
  if (document.pageId) { if (document.pageId !== id) throw Error('Changed page identity'); return source }
  if (document.issues.length) throw Error('Invalid note document')
  const newline = source.includes('\r\n') ? '\r\n' : '\n'
  const header = memoryHeader(memoryLines(source))
  if (header === 'unclosed') throw Error('Invalid note document')
  const line = `_memnova_page_id: ${id}${newline}`
  if (header) return `${source.slice(0, header.contentEnd)}${line}${source.slice(header.contentEnd)}`
  const bom = source.startsWith('\ufeff') ? '\ufeff' : ''
  return `${bom}---${newline}${line}---${newline}${source.slice(bom.length)}`
}
function notes(env: Pick<Environment, 'data'>): FixtureNoteMemory { return env.data.noteMemory ?? { bindings: {}, operations: {} } }
function writable(env: Environment): FixtureNoteMemory { return env.data.noteMemory ??= { bindings: {}, operations: {} } }
function page(env: Pick<Environment, 'data'>, id: string) { const value = env.data.pages.find(page => page.id === id); if (!value) throw Error('Missing note'); return value }
async function read(env: ReadEnvironment, id: string): Promise<string> {
  const target = page(env, id)
  if (!target.available) throw Error('Missing note source')
  return env.data.restoredFiles?.[target.path] ?? env.context.read(mockNotePath(env.root, target.path))
}
async function linkedBack(env: ReadEnvironment, owner: string, config: NoteMemoryConfig, fallback: string): Promise<string> {
  if (config.back.kind === 'inline') return fallback
  if (config.back.pageId === owner) throw Error('self-source')
  const target = parseNoteMemoryDocument(await read(env, config.back.pageId))
  if (target.issues.length || target.pageId !== config.back.pageId) throw Error('invalid-source')
  if (config.back.face === 'front') return target.front
  if (target.config?.back.kind === 'page') throw Error('recursive-back-source')
  if (!target.ranges.back) throw Error('missing-source-back')
  return target.back
}
async function view(env: ReadEnvironment, id: string, ignore?: string): Promise<{ value: NoteMemoryView; identityValid: boolean }> {
  const target = page(env, id)
  const binding = notes(env).bindings[id] ?? null
  const card = binding ? env.data.cards.find(card => card.id === binding.cardId) : undefined
  if (binding && (!card || card.pageId !== id)) throw Error('Invalid note binding')
  const value: NoteMemoryView = { pageId: id, path: target.path, binding, schedule: card?.schedule ?? null, sourceHash: null, hasBack: false, config: null, state: 'invalid', legacyCardCount: env.data.cards.filter(card => card.pageId === id && !isMockBoundCard(env.data, card.id)).length, diagnostics: [], pendingOperations: [] }
  let identityValid = false
  try {
    const source = await read(env, id)
    const document = parseNoteMemoryDocument(source)
    value.sourceHash = await env.hash(source); value.config = document.config; value.hasBack = Boolean(document.ranges.back)
    identityValid = document.pageId === id
    await projectNoteState(env, value, document, identityValid)
  } catch (error) { value.diagnostics.push(error instanceof Error ? error.message : 'unreadable-page'); value.state = 'invalid' }
  value.pendingOperations = Object.values(notes(env).operations).filter(op => op.pageId === id && op.phase !== 'applied' && op.operationId !== ignore).map(({ operationId, kind, phase, createdAt }) => ({ operationId, kind, phase, createdAt }))
  if (value.pendingOperations.length) value.state = 'pending'
  return { value, identityValid }
}
async function projectNoteState(env: ReadEnvironment, value: NoteMemoryView, document: ReturnType<typeof parseNoteMemoryDocument>, identityValid: boolean): Promise<void> {
  const binding = value.binding
  const id = value.pageId
  if (!identityValid || document.issues.length) value.diagnostics.push('invalid-document')
  else if (!document.config) value.state = binding ? 'invalid' : value.hasBack ? 'retained' : 'ordinary'
  else if (!document.config.enabled) value.state = 'disabled'
  else if (!binding && value.legacyCardCount) value.state = 'conversionRequired'
  else {
    const front = usefulMemoryContent(document.front)
    const back = usefulMemoryContent(await linkedBack(env, id, document.config, document.back))
    value.state = front && back ? 'ready' : 'draft'
  }
}
function reconcile(env: Environment, current: NoteMemoryView, identityValid: boolean, plannedCard: string = crypto.randomUUID()): number | null {
  if (current.state === 'pending') throw Error('pending-operation')
  const status = current.state === 'ready' ? 'active' : current.state === 'draft' ? 'draft' : 'suspended'
  const binding = current.binding
  if (binding) {
    const card = env.data.cards.find(card => card.id === binding.cardId)
    if (!card || card.status === 'trashed') throw Error('Invalid bound card')
    if ((current.sourceHash ?? binding.sourceHash) !== binding.sourceHash || card.status !== status) {
      binding.sourceHash = current.sourceHash ?? binding.sourceHash; binding.revision++; card.revision++; card.status = status; card.updatedAt = Date.now()
    }
    return binding.revision
  }
  if (!identityValid || !current.config?.enabled || current.state === 'conversionRequired' || !current.sourceHash) return null
  const card: LearningCard = { id: plannedCard, pageId: current.pageId, front: '', back: '', answerMode: 'inline', status, position: 0, properties: {}, propertyDefinitions: {}, createdAt: Date.now(), updatedAt: Date.now(), revision: 0, schedule: env.fresh() }
  env.data.cards.push(card)
  writable(env).bindings[current.pageId] = { pageId: current.pageId, cardId: card.id, sourceHash: current.sourceHash, revision: 0 }
  return 0
}
function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid note request')
  return value as Record<string, unknown>
}
function validateFields(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(value, key))) throw Error('Invalid note request fields')
}
function request(value: unknown, kind: 'save' | 'configure'): NoteWriteRequest | NoteConfigureRequest {
  const input = object(value)
  validateFields(input, ['operationId', 'pageId', 'expectedHash', 'expectedRevision', kind === 'save' ? 'source' : 'config'])
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (typeof input.operationId !== 'string' || !uuid.test(input.operationId) || typeof input.pageId !== 'string' || !uuid.test(input.pageId) || typeof input.expectedHash !== 'string' || !/^[0-9a-f]{64}$/.test(input.expectedHash) || !(input.expectedRevision === null || Number.isInteger(input.expectedRevision) && Number(input.expectedRevision) >= 0 && Number(input.expectedRevision) <= 4294967295)) throw Error('Invalid note identity/fingerprint/revision')
  const base = { operationId: input.operationId, pageId: input.pageId, expectedHash: input.expectedHash, expectedRevision: input.expectedRevision as number | null }
  if (kind === 'save') { if (typeof input.source !== 'string') throw Error('Invalid note source'); return { ...base, source: input.source } }
  const config = object(input.config); validateFields(config, ['version', 'enabled', 'back'])
  const back = object(config.back)
  if (config.version !== 1 || typeof config.enabled !== 'boolean') throw Error('Invalid configuration')
  if (back.kind === 'inline') { validateFields(back, ['kind']); return { ...base, config: { version: 1, enabled: config.enabled, back: { kind: 'inline' } } } }
  validateFields(back, ['kind', 'pageId', 'face'])
  if (back.kind !== 'page' || typeof back.pageId !== 'string' || !uuid.test(back.pageId) || !['front', 'back'].includes(String(back.face))) throw Error('Invalid back source')
  return { ...base, config: { version: 1, enabled: config.enabled, back: { kind: 'page', pageId: back.pageId.toLowerCase(), face: back.face as 'front' | 'back' } } }
}
function outcome(op: Operation, status: NoteWriteOutcome['status'], problem: string | null, revision: number | null = null): NoteWriteOutcome {
  return { operationId: op.operationId, pageId: op.pageId, status, sourceHash: op.afterHash, revision, problem }
}
async function resume(env: Environment, op: Operation): Promise<NoteWriteOutcome> {
  if (op.kind === 'convert') throw Error('Use the conversion runner')
  if (op.outcome) return op.outcome
  let source: string
  try { source = await read(env, op.pageId) } catch { op.phase = 'conflict'; env.persist(); return outcome(op, 'conflict', 'missing-source') }
  const hash = await env.hash(source)
  if (hash !== op.beforeHash && hash !== op.afterHash) { op.phase = 'conflict'; env.persist(); return outcome(op, 'conflict', 'changed-source') }
  if ((notes(env).bindings[op.pageId]?.revision ?? null) !== op.expectedRevision) { op.phase = 'conflict'; env.persist(); return outcome(op, 'conflict', 'changed-revision') }
  if (hash !== op.afterHash) {
    try {
      if (op.source === null || !env.context.write) throw Error('Browser fixture source writer unavailable')
      const target = page(env, op.pageId)
      await env.context.write(mockNotePath(env.root, target.path), op.source)
      if (env.data.restoredFiles) env.data.restoredFiles[target.path] = op.source
    } catch (error) { env.persist(); return outcome(op, 'pending', error instanceof Error ? error.message : 'write-failed') }
  }
  op.phase = 'file_written'; env.persist()
  const current = await view(env, op.pageId, op.operationId)
  if (current.value.sourceHash !== op.afterHash) { op.phase = 'conflict'; env.persist(); return outcome(op, 'conflict', 'changed-source') }
  if (!current.identityValid || current.value.state === 'conversionRequired') return outcome(op, 'pending', 'invalid-note-source')
  const revision = reconcile(env, current.value, current.identityValid, op.cardId)
  op.outcome = outcome(op, 'committed', null, revision); op.phase = 'applied'; op.source = null; env.persist()
  return op.outcome
}
async function prepare(env: Environment, raw: unknown, kind: 'save' | 'configure'): Promise<NoteWriteOutcome> {
  const input = request(raw, kind)
  const requestHash = await env.hash(JSON.stringify({ kind, input }))
  const old = notes(env).operations[input.operationId]
  if (old) { if (old.requestHash !== requestHash) throw Error('Different immutable intent'); return resume(env, old) }
  const current = await view(env, input.pageId)
  if (!current.identityValid || current.value.state === 'pending') throw Error('Invalid note identity or pending operation')
  if (current.value.sourceHash !== input.expectedHash || (current.value.binding?.revision ?? null) !== input.expectedRevision) throw Error('Changed source/revision')
  const before = await read(env, input.pageId)
  let source: string
  if ('config' in input) {
    if (!current.value.binding && current.value.legacyCardCount) throw Error('conversion-required')
    if (input.config.enabled || JSON.stringify(input.config.back) !== JSON.stringify(current.value.config?.back)) await linkedBack(env, input.pageId, input.config, '')
    source = patchNoteMemoryConfig(before, input.config)
  } else source = input.source
  const document = parseNoteMemoryDocument(source)
  if (document.issues.length || document.pageId !== input.pageId) throw Error('Invalid note source')
  const op: Operation = { operationId: input.operationId, pageId: input.pageId, kind, phase: 'prepared', requestHash, beforeHash: input.expectedHash, afterHash: await env.hash(source), expectedRevision: input.expectedRevision, source, cardId: current.value.binding?.cardId ?? crypto.randomUUID(), outcome: null, createdAt: Date.now() }
  writable(env).operations[op.operationId] = op; env.persist()
  return resume(env, op)
}
export async function mockNoteMemoryCommand(env: Environment, input: Record<string, unknown>): Promise<unknown> {
  if (['saveNoteMemory','configureNoteMemory'].includes(String(input.kind))) validateFields(input, ['kind','request'])
  else if (input.kind === 'readNoteFace') validateFields(input, ['kind', 'pageId', 'face'])
  else validateFields(input, ['kind',input.kind === 'resumeNoteMemory' ? 'operationId' : 'pageId'])
  switch (input.kind) {
    case 'readNoteFace': return mockNoteFace(env, String(input.pageId), input.face)
    case 'readNoteMemory': return (await view(env, String(input.pageId))).value
    case 'saveNoteMemory': return prepare(env, input.request, 'save')
    case 'configureNoteMemory': return prepare(env, input.request, 'configure')
    case 'resumeNoteMemory': { const op = notes(env).operations[String(input.operationId)]; if (!op) throw Error('Missing operation'); return resume(env, op) }
    case 'reconcileNoteMemory': {
      const current = await view(env, String(input.pageId))
      const before = JSON.stringify({ binding: current.value.binding, cards: env.data.cards })
      reconcile(env, current.value, current.identityValid)
      if (JSON.stringify({ binding: notes(env).bindings[current.value.pageId] ?? null, cards: env.data.cards }) !== before) env.persist()
      return (await view(env, current.value.pageId)).value
    }
    default: throw Error('Unsupported QA note operation')
  }
}

export async function mockNoteFace(env: ReadEnvironment, id: string, face: unknown): Promise<NoteFacePreview> {
  if (face !== 'front' && face !== 'back') throw Error('Invalid note face')
  const source = await read(env, id)
  const document = parseNoteMemoryDocument(source)
  if (document.pageId !== id || document.issues.length) throw Error('Invalid note source')
  if (face === 'back' && (!document.ranges.back || document.config?.back.kind === 'page')) throw Error('Missing or recursive source back')
  const target = page(env, id)
  return { pageId: id, path: target.path, face, content: document[face], fingerprint: await env.hash(JSON.stringify({ source: await env.hash(source), path: target.path, face })), media: [] }
}

/** Text/identity QA model; binary media verification is exercised by native tests. */
export async function mockNoteStudyContent(env: ReadEnvironment, card: LearningCard): Promise<Omit<StudyItem, 'card'>> {
  if (hasMockPendingNote(env.data, card.pageId)) throw Error('pending-note-operation')
  const current = await view(env, card.pageId)
  if (current.value.state !== 'ready' || current.value.binding?.cardId !== card.id || !current.value.config) throw Error('Note source is not ready')
  const owner = await mockNoteFace(env, card.pageId, 'front')
  const back = current.value.config.back
  const reverse = await mockNoteFace(env, back.kind === 'inline' ? card.pageId : back.pageId, back.kind === 'inline' ? 'back' : back.face)
  const original = parseNoteMemoryDocument(await read(env, card.pageId))
  return {
    page: { id: card.pageId, path: owner.path, title: page(env, card.pageId).title, content: owner.content, fingerprint: owner.fingerprint },
    answerPage: { id: reverse.pageId, path: reverse.path, title: page(env, reverse.pageId).title, content: reverse.content, fingerprint: reverse.fingerprint },
    sourceError: null,
    content: { kind: 'note', details: { backSource: { pageId: reverse.pageId, path: reverse.path, face: reverse.face }, propertiesRaw: (await read(env, card.pageId)).slice(0, original.offsets.front.start), frontMedia: [], backMedia: [], fingerprint: await env.hash(`${owner.fingerprint}\0${reverse.fingerprint}`) } },
  }
}

export async function reconcileKeptMockNote(env: Environment, pageId: string, ignore: string): Promise<number | null> {
  const current = await view(env,pageId,ignore)
  if (!current.value.binding || current.value.state === 'pending') return current.value.binding?.revision ?? null
  return reconcile(env,current.value,current.identityValid)
}
