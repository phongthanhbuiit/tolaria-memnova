/** Browser text model; native tests prove filesystem/SQLite preservation. */
import type { Context, Fixture } from './learning'
import type { LearningSchedule, NoteWriteOutcome } from '../lib/learning/types'
import type { NoteRecoveryRequest, NoteRecoverySummary, NoteRecoveryView } from '../lib/learning/noteConversionTypes'
import { mockNotePath, reconcileKeptMockNote, type FixtureNoteOperation } from './note-memory'
export interface FixtureNoteResolution { request: NoteRecoveryRequest; path: string | null; source: string | null; hash: string | null; resolvedAt: number }
type Environment = { data: Fixture; root: string; context: Context; hash: (value: string) => Promise<string>; fresh: () => LearningSchedule; persist: () => void }
const kinds = new Set(['listNoteRecovery','readNoteRecovery','resolveNoteRecovery'])
export const isMockRecoveryRequest = (kind: unknown) => typeof kind === 'string' && kinds.has(kind)
function operation(env: Environment, id: string): FixtureNoteOperation { const op = env.data.noteMemory?.operations[id]; if (!op) throw Error('missing-note-operation'); return op }
async function current(env: Environment, op: FixtureNoteOperation) {
  const page = env.data.pages.find(page => page.id === op.pageId && page.available)
  if (!page) return { path: null, source: null, hash: null }
  let source: string | null = null
  try { source = env.data.restoredFiles?.[page.path] ?? await env.context.read(mockNotePath(env.root,page.path)) } catch { /* Fixture missing file. Native distinguishes permissions and bad UTF-8. */ }
  return { path: page.path, source, hash: source === null ? null : await env.hash(source) }
}
function resolutionRequest(value: unknown): NoteRecoveryRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid-recovery-request')
  const input = value as Record<string,unknown>, keys = ['operationId','expectedCurrentHash','choice']
  if (Object.keys(input).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(input,key)) || typeof input.operationId !== 'string' || input.choice !== 'keepDisk' || !(input.expectedCurrentHash === null || typeof input.expectedCurrentHash === 'string' && /^[a-f0-9]{64}$/.test(input.expectedCurrentHash))) throw Error('invalid-recovery-request')
  return { operationId: input.operationId, expectedCurrentHash: input.expectedCurrentHash as string | null, choice: 'keepDisk' }
}
async function resolve(env: Environment, raw: unknown): Promise<NoteWriteOutcome> {
  const request = resolutionRequest(raw), op = operation(env,request.operationId)
  if (op.outcome) {
    if (JSON.stringify(op.resolution?.request) === JSON.stringify(request)) return op.outcome
    throw Error('note-operation-already-finished')
  }
  const source = await current(env,op)
  if (source.hash !== request.expectedCurrentHash) throw Error('recovery-source-changed')
  const staged = structuredClone(env.data)
  const revision = await reconcileKeptMockNote({ ...env, data: staged },op.pageId,op.operationId)
  const latest = await current(env,op)
  if (JSON.stringify(source) !== JSON.stringify(latest)) throw Error('recovery-source-changed')
  env.data.cards = staged.cards
  if (env.data.noteMemory && staged.noteMemory) env.data.noteMemory.bindings = staged.noteMemory.bindings
  op.resolution = { request, ...source, resolvedAt: Date.now() }
  op.outcome = { operationId: op.operationId, pageId: op.pageId, status: 'discarded', sourceHash: op.afterHash, revision, problem: 'kept-current-source' }
  op.phase = 'applied'; env.persist()
  return op.outcome
}
async function read(env: Environment, id: string): Promise<NoteRecoveryView> {
  const op = operation(env,id), source = await current(env,op)
  return { operationId: id, pageId: op.pageId, phase: op.phase, draftSource: op.source, beforeSource: op.conversion?.beforeSource ?? null, currentPath: source.path, currentSource: source.source, currentHash: source.hash, sourceError: null, keptSource: op.resolution?.source ?? null, outcome: op.outcome }
}
export async function mockRecoveryCommand(env: Environment, request: Record<string,unknown>): Promise<unknown> {
  if (request.kind === 'listNoteRecovery') {
    if (typeof request.includeResolved !== 'boolean' || Object.keys(request).some(key => !['kind','includeResolved'].includes(key))) throw Error('invalid-recovery-request')
    return Object.values(env.data.noteMemory?.operations ?? {}).filter(op => op.phase !== 'applied' || request.includeResolved && op.resolution).map((op):NoteRecoverySummary => ({ operationId: op.operationId, pageId: op.pageId, kind: op.kind, phase: op.phase, createdAt: op.createdAt }))
  }
  const field = request.kind === 'resolveNoteRecovery' ? 'request' : 'operationId'
  if (!Object.hasOwn(request,field) || Object.keys(request).some(key => !['kind',field].includes(key))) throw Error('invalid-recovery-request')
  if (request.kind === 'resolveNoteRecovery') return resolve(env,request.request)
  if (request.kind === 'readNoteRecovery') return read(env,String(request.operationId))
  throw Error('invalid-recovery-routing')
}
