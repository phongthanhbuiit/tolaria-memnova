import { mockNoteWorkspace } from './note-workspace'
import { normalizeSessionScope } from '../lib/learning/sessionScope'
import { isMockRecoveryRequest, mockRecoveryCommand } from './note-recovery'
import { createMockLearningBackup } from './learning-backup'
import { isMockConversionRequest, mockConversionCommand } from './note-conversion-runner'
import { mockNoteConversionPreview } from './note-conversion'
import { isNoteMemoryRequest, mockNoteMemoryCommand, mockNoteStudyContent, isMockBoundCard, hasMockPendingNote, mockNotePath, withMockNoteIdentity, type FixtureNoteMemory } from './note-memory'
import { parseNoteMemoryDocument } from '../lib/learning/noteMemoryDocument'
import { mockNoteSourcePreview } from './note-source-preview'
import { matchesProperty, propertyKey, type PropertyDefinitions } from '../lib/learning/propertyValues'
/** Browser-only QA fixture. Native learning data always uses Rust/SQLite. */
import type { BackupDescriptor, CardDraft, LearningCard, LearningPage, LearningSchedule, RateRequest, SessionScope, StudyPage, StudySession } from '../lib/learning/types'
import { splitFrontmatter } from '../utils/wikilinks'
import type { StudyStats } from '../hooks/useStats'
import type { VaultEntry } from '../types'

type FixtureSession = { id: string; scope: SessionScope; ids: string[]; initial: number; index: number; revision: number; status: StudySession['status'] }
type Receipt = { request: RateRequest; before: LearningSchedule; index: number; reinserted: boolean; xp: number; undone: boolean }
export type Fixture = { noteMemory?: FixtureNoteMemory; pageDefinitions?: Record<string, PropertyDefinitions>; id: string; pages: LearningPage[]; cards: LearningCard[]; sessions: FixtureSession[]; reviews: Receipt[]; goal: number; backups?: { descriptor: BackupDescriptor; snapshot: string; files: Record<string, string> }[]; restoredFiles?: Record<string,string> }
export type Context = { allContent?: () => Promise<Record<string,string>>; write?: (path: string, content: string) => Promise<void>; read: (path: string) => Promise<string>; entries: () => Promise<VaultEntry[]> }
const fixtures = new Map<string, Fixture>()
const fresh = (): LearningSchedule => ({ state: 'new', due: new Date().toISOString(), stability: 0, difficulty: 0, reps: 0, lapses: 0, elapsedDays: 0, scheduledDays: 0, lastReview: null, learningSteps: 0, engine: 'legacy-fsrs5', revision: 0 })
function fixture(root: string): Fixture {
  const existing = fixtures.get(root)
  if (existing) return existing
  const raw = localStorage.getItem(`memnova:qa-learning:${root}`)
  const data: Fixture = raw ? JSON.parse(raw) : { id: crypto.randomUUID(), pages: [], cards: [], sessions: [], reviews: [], goal: 20 }
  fixtures.set(root, data)
  return data
}
async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
async function source(root: string, page: LearningPage, context: Context): Promise<StudyPage> {
  const content = fixture(root).restoredFiles?.[page.path] ?? await context.read(`${root}/${page.path}`)
  return { ...page, content: splitFrontmatter(content)[1], fingerprint: await hash(content) }
}
function stats(data: Fixture): StudyStats {
  const today = new Date().toLocaleDateString('en-CA')
  const reviews = data.reviews.filter(review => !review.undone)
  const current = reviews.filter(review => new Date(review.request.reviewedAt).toLocaleDateString('en-CA') === today)
  const heatmap = new Map<string, number>()
  for (const review of reviews) { const day = new Date(review.request.reviewedAt).toLocaleDateString('en-CA'); heatmap.set(day, (heatmap.get(day) ?? 0) + 1) }
  const combo = [...current].reverse().findIndex(review => review.request.rating < 3)
  return { totalXp: reviews.reduce((sum, review) => sum + review.xp, 0), dailyGoal: data.goal, todayReviews: current.length, todayCorrect: current.filter(review => review.request.rating >= 3).length, todayXp: current.reduce((sum, review) => sum + review.xp, 0), todayDurationMs: current.reduce((sum, review) => sum + review.request.durationMs, 0), heatmap: [...heatmap].map(([date, count]) => ({ date, count })), combo: combo < 0 ? current.length : combo, streak: current.length ? 1 : 0, lastStudyDate: current.length ? today : null }
}
async function snapshot(data: Fixture, row: FixtureSession, root: string, context: Context): Promise<StudySession> {
  const pending = row.ids.slice(row.index).map((id, offset) => ({ card: data.cards.find(card => card.id === id), index: row.index + offset })).filter(item => item.card?.status === 'active' && isMockBoundCard(data, item.card.id) === (row.scope.lane === 'notes') && (Date.parse(item.card.schedule.due) <= Date.now() || ['learning', 'relearning'].includes(item.card.schedule.state)))
  const ready = pending.find(item => item.card && Date.parse(item.card.schedule.due) <= Date.now())
  if (!pending.length) { row.status = 'completed'; row.index = row.ids.length }
  let current: StudySession['current'] = null
  if (ready?.card) {
    if (ready.index !== row.index) { [row.ids[ready.index], row.ids[row.index]] = [row.ids[row.index], row.ids[ready.index]]; row.revision++ }
    const page = data.pages.find(page => page.id === ready.card?.pageId)
    let owner: StudyPage | null = null
    let answerPage: StudyPage | null = null
    let sourceError: string | null = null
    try {
      owner = await source(root, required(page), context)
      if (ready.card.answerMode === 'page' && ready.card.answerPageId) {
        answerPage = await source(root, required(data.pages.find(page => page.id === ready.card?.answerPageId)), context)
        answerPage.fingerprint = await hash(`${answerPage.path}\0${answerPage.fingerprint}`)
      }
    } catch (error) { sourceError = String(error) }
    current = { card: ready.card, page: owner, answerPage, sourceError, content: { kind: 'legacy' } }
    if (isMockBoundCard(data, ready.card.id)) {
      try { current = { card: ready.card, ...await mockNoteStudyContent({ data, root, context, hash }, ready.card) } }
      catch (error) { current = { card: ready.card, page: null, answerPage: null, sourceError: String(error), content: { kind: 'note', details: null } } }
    } else if (hasMockPendingNote(data, ready.card.pageId)) current.sourceError = 'pending-note-operation'
  }
  const reviews = data.reviews.filter(review => !review.undone && review.request.sessionId === row.id)
  const last = [...data.reviews].reverse().find(review => !review.undone)
  return { id: row.id, scope: row.scope, initialCount: row.initial, currentIndex: row.index, revision: row.revision, status: row.status, updatedAt: Date.now(), current, waitingUntil: current ? null : pending.length ? Math.min(...pending.map(item => Date.parse(item.card?.schedule.due ?? ''))) : null, completedCount: row.initial - pending.length, reviewCount: reviews.length, correctCount: reviews.filter(review => review.request.rating >= 3).length, lastReviewId: last?.request.sessionId === row.id ? last.request.reviewId : null, canUndo: last?.request.sessionId === row.id }
}
function required<T>(value: T | undefined): T { if (value === undefined) throw new Error('Missing QA learning record'); return value }
function draft(value: unknown): CardDraft {
  const result = value as CardDraft
  if (result.status === 'active' && (!result.front.trim() || (result.answerMode === 'inline' && !result.back.trim()))) throw new Error('An active card needs a question and an answer')
  for(const [key,definition] of Object.entries(result.propertyDefinitions??{})) {
    propertyKey(key)
    if(!Object.hasOwn(result.properties,key)||!matchesProperty(result.properties[key],definition))throw Error('Property value does not match its declared type')
  }
  return result
}

const fixtureCommands = new Map<string, Promise<unknown>>()
export function mockLearningCommand(args: Record<string, unknown>, context: Context): Promise<unknown> {
  const root = String(args.vaultPath).replace(/\/$/, '')
  const previous = fixtureCommands.get(root) ?? Promise.resolve()
  const run = () => executeMockLearningCommand(args, context)
  const task = previous.then(run, run)
  fixtureCommands.set(root, task)
  return task.finally(() => { if (fixtureCommands.get(root) === task) fixtureCommands.delete(root) })
}
async function executeMockLearningCommand(args: Record<string, unknown>, context: Context): Promise<unknown> {
  const root = String(args.vaultPath).replace(/\/$/, '')
  const request = args.request as Record<string, unknown>
  if (request.kind === 'previewNoteSource') {
    const cached = fixtures.get(root)
    const raw = cached ? null : localStorage.getItem(`memnova:qa-learning:${root}`)
    const existing: Fixture | null = cached ?? (raw ? JSON.parse(raw) : null)
    if (!existing || args.libraryId !== existing.id) throw Error('Library identity changed')
    return mockNoteSourcePreview(root, existing, context, request, hash)
  }
  if (request.kind === 'previewNoteConversion') {
    if (Object.keys(request).some(key => key !== 'kind')) throw Error('Invalid conversion preview request')
    const cached = fixtures.get(root)
    const raw = cached ? null : localStorage.getItem(`memnova:qa-learning:${root}`)
    const existing: Fixture | null = cached ?? (raw ? JSON.parse(raw) : null)
    if (args.libraryId != null && args.libraryId !== existing?.id) throw Error('Library identity changed')
    return mockNoteConversionPreview(root, existing, context, hash)
  }
  const data = fixture(root)
  if (isMockRecoveryRequest(request.kind)) {
    if (args.libraryId !== data.id) throw Error('Library identity changed')
    return structuredClone(await mockRecoveryCommand({ data, root, context, fresh, hash, persist: () => localStorage.setItem(`memnova:qa-learning:${root}`, JSON.stringify(data)) }, request))
  }
  if (isMockConversionRequest(request.kind) || request.kind === 'resumeNoteMemory' && data.noteMemory?.operations[String(request.operationId)]?.kind === 'convert') {
    if (args.libraryId !== data.id) throw Error('Library identity changed')
    return structuredClone(await mockConversionCommand({ data, root, context, fresh, hash, persist: () => localStorage.setItem(`memnova:qa-learning:${root}`, JSON.stringify(data)) }, request))
  }
  if (isNoteMemoryRequest(request.kind)) {
    if (args.libraryId !== data.id) throw Error('Library identity changed')
    return structuredClone(await mockNoteMemoryCommand({ data, root, context, fresh, hash, persist: () => localStorage.setItem(`memnova:qa-learning:${root}`, JSON.stringify(data)) }, request))
  }
  let changed = !['describe', 'migrationStatus', 'listPages', 'listCards', 'studyStats', 'syncPages', 'listBackups', 'verifyBackup', 'readStudyPage', 'pagePropertyDefinitions'].includes(String(request.kind))
  const call = async (): Promise<unknown> => {
    switch (request.kind) {
      case 'describe': return { libraryId: data.id, schemaVersion: 5, migrationState: 'ready', capabilities: { noteMemory: 1, noteStudy: 1, noteWorkspace: 1 } }
      case 'migrationStatus': return { state: 'ready', libraryId: data.id, backupId: null, totalPages: data.pages.length, importedPages: data.pages.length, totalCards: 0, importedCards: 0, importedReviews: 0 }
      case 'readStudyPage': return source(root, required(data.pages.find(page => page.id === request.pageId)), context)
      case 'pagePropertyDefinitions': {
        required(data.pages.find(page=>page.id===request.pageId))
        return data.pageDefinitions?.[String(request.pageId)] ?? {}
      }
      case 'setPagePropertyDefinitions': {
        required(data.pages.find(page=>page.id===request.pageId))
        const current=data.pageDefinitions?.[String(request.pageId)] ?? {}
        const next=request.definitions as PropertyDefinitions
        if(JSON.stringify(current)!==JSON.stringify(request.expected) && JSON.stringify(current)!==JSON.stringify(next))throw Error('Property types changed; reload before saving')
        for(const key of Object.keys(next))propertyKey(key)
        ;(data.pageDefinitions??={})[String(request.pageId)]=next
        return next
      }
      case 'syncNoteWorkspace': {
        if (Object.keys(request).some(key=>key!=='kind')) throw Error('Invalid workspace request')
        return mockNoteWorkspace({data,root,context,fresh,hash,persist:()=>localStorage.setItem(`memnova:qa-learning:${root}`,JSON.stringify(data))})
      }
      case 'listPages': return data.pages
      case 'syncPages': {
        const entries = await context.entries()
        const byPath = new Map(data.pages.map(page => [page.path, page]))
        const sources = context.allContent && entries.some(entry => !byPath.has(entry.path.slice(root.length + 1))) ? await context.allContent() : null
        for (const entry of entries.filter(entry => entry.path.startsWith(`${root}/`) && /\.md$/i.test(entry.path))) {
          const path = entry.path.slice(root.length + 1)
          const existing = byPath.get(path)
          if (existing) { if (existing.title !== entry.title) { existing.title = entry.title; changed = true } }
          else {
            const owned = parseNoteMemoryDocument(sources?.[entry.path] ?? await context.read(entry.path)).pageId
            if (owned && data.pages.some(page => page.id === owned && page.path !== path)) throw Error('Duplicate page identity')
            changed = true; data.pages.push({ id: owned ?? crypto.randomUUID(), path, title: entry.title, available: true, createdAt: entry.createdAt, modifiedAt: entry.modifiedAt })
          }
        }
        return data.pages
      }
      case 'ensurePage': {
        const path = String(request.path)
        const source = await context.read(mockNotePath(root, path))
        if (request.expectedHash !== undefined && (typeof request.expectedHash !== 'string' || request.expectedHash !== await hash(source))) throw Error('Changed source before identity assignment')
        const document = parseNoteMemoryDocument(source)
        if (!document.pageId && request.expectedHash !== undefined) {
          await createMockLearningBackup(data, root, context, {[path]:source})
          if (await hash(await context.read(mockNotePath(root,path))) !== await hash(source)) throw Error('Changed source during identity assignment')
        }
        let page = data.pages.find(page => page.path === path)
        if (!page) { page = { id: document.pageId ?? crypto.randomUUID(), path, title: path.split('/').pop()?.replace(/\.md$/, '') ?? path, available: true, createdAt: null, modifiedAt: null }; data.pages.push(page) }
        if (context.write) {
          const updated = withMockNoteIdentity(source, page.id)
          if (updated !== source) await context.write(mockNotePath(root, path), updated)
        }
        return page
      }
      case 'listCards': return data.cards.filter(card => !isMockBoundCard(data, card.id) && (!request.pageId || card.pageId === request.pageId) && (request.includeTrashed || card.status !== 'trashed'))
      case 'createCard': case 'cloneCard': {
        const original = request.kind === 'cloneCard' ? required(data.cards.find(card => card.id === request.cardId)) : null
        if (original && isMockBoundCard(data, original.id)) throw Error('bound-note-card: open the note editor')
        if (hasMockPendingNote(data, original?.pageId ?? String(request.pageId))) throw Error('pending-note-operation')
        if (original?.status === 'trashed') throw new Error('Restore a trashed card before cloning')
        const input = original ? { ...original, status: 'draft' as const } : draft(request.draft)
        const card: LearningCard = { ...input, propertyDefinitions: input.propertyDefinitions ?? {}, pageId: original?.pageId ?? String(request.pageId), id: original ? crypto.randomUUID() : typeof request.operationId === 'string' ? request.operationId : crypto.randomUUID(), revision: 0, createdAt: Date.now(), updatedAt: Date.now(), schedule: fresh() }
        const existing = data.cards.find(value => value.id === card.id)
        if (existing) return existing
        data.cards.push(card); return card
      }
      case 'updateCard': {
        const card = required(data.cards.find(card => card.id === request.cardId))
        if (isMockBoundCard(data, card.id)) throw Error('bound-note-card: open the note editor')
        if (hasMockPendingNote(data, card.pageId)) throw Error('pending-note-operation')
        const input = draft({...request.draft as CardDraft, propertyDefinitions:(request.draft as CardDraft).propertyDefinitions??card.propertyDefinitions??{}})
        const keys=['front','back','answerMode','answerPageId','status','position','properties','propertyDefinitions']
        if(card.revision===Number(request.revision)+1 && keys.every(key=>JSON.stringify(Reflect.get(input,key)??null)===JSON.stringify(Reflect.get(card,key)??null)))return card
        if (card.revision !== request.revision) throw new Error('Card changed; reload')
        if (card.status === 'trashed' && (input.status !== 'draft' || ['front', 'back', 'answerMode', 'answerPageId', 'position', 'properties', 'propertyDefinitions'].some(key => JSON.stringify(Reflect.get(input, key) ?? null) !== JSON.stringify(Reflect.get(card, key) ?? null)))) throw new Error('Restore a trashed card to Draft before editing')
        Object.assign(card, input, { revision: card.revision + 1, updatedAt: Date.now() }); return card
      }
      case 'listBackups': return (data.backups ?? []).map(backup => ({ id: backup.descriptor.id, descriptor: backup.descriptor, error: null }))
      case 'verifyBackup': return required(data.backups?.find(backup => backup.descriptor.id === request.backupId)).descriptor
      case 'createBackup': return createMockLearningBackup(data, root, context)
      case 'restoreBackup': {
        const backup = required(data.backups?.find(backup => backup.descriptor.id === request.backupId))
        const path = `${root}/restored-${crypto.randomUUID()}`
        const restored: Fixture = { ...JSON.parse(backup.snapshot), restoredFiles: backup.files }
        fixtures.set(path, restored); localStorage.setItem(`memnova:qa-learning:${path}`, JSON.stringify(restored))
        return { path }
      }
      case 'studyStats': return stats(data)
      case 'setDailyGoal': data.goal = Number(request.goal); return stats(data)
      case 'startSession': {
        const scope = normalizeSessionScope(request.scope)
        const existing = data.sessions.find(row => row.status !== 'completed' && JSON.stringify(normalizeSessionScope(row.scope)) === JSON.stringify(scope))
        if (existing) { existing.status = 'active'; return snapshot(data, existing, root, context) }
        const ids = data.cards.filter(card => card.status === 'active' && !hasMockPendingNote(data, card.pageId) && isMockBoundCard(data, card.id) === (scope.lane === 'notes') && Date.parse(card.schedule.due) <= Date.now() && (scope.pageIds === null || scope.pageIds.includes(card.pageId))).map(card => card.id)
        const row: FixtureSession = { id: crypto.randomUUID(), scope, ids, initial: ids.length, index: 0, revision: 0, status: ids.length ? 'active' : 'completed' }
        data.sessions.push(row); return snapshot(data, row, root, context)
      }
      case 'getSession': case 'resumeSession': case 'pauseSession': case 'skipSessionCard': {
        const row = required(data.sessions.find(row => row.id === request.sessionId))
        if (request.kind === 'pauseSession') { row.status = row.status === 'completed' ? 'completed' : 'paused'; row.revision++ }
        if (request.kind === 'resumeSession' && row.status === 'paused') { row.status = 'active'; row.revision++ }
        if (request.kind === 'skipSessionCard') { row.index++; row.revision++ }
        return snapshot(data, row, root, context)
      }
      case 'rateCard': {
        const review = request.review as RateRequest
        const row = required(data.sessions.find(row => row.id === review.sessionId))
        const previous = data.reviews.find(item => item.request.reviewId === review.reviewId)
        if (previous) { if (previous.undone || JSON.stringify(previous.request) !== JSON.stringify(review)) throw new Error('Conflicting review identity'); return { session: await snapshot(data, row, root, context), earnedXp: previous.xp, replayed: true } }
        const card = required(data.cards.find(card => card.id === review.cardId))
        if (row.revision !== review.sessionRevision || card.revision !== review.cardRevision || card.schedule.revision + 1 !== review.schedule.revision) throw new Error('Stale study state')
        const current = await snapshot(data, row, root, context)
        if (current.current?.sourceError || current.current?.page?.fingerprint !== review.sourceFingerprint || current.current?.answerPage?.fingerprint !== review.answerFingerprint) throw new Error('Source changed')
        const before = structuredClone(card.schedule)
        const reinserted = ['learning', 'relearning'].includes(review.schedule.state)
        const combo = review.rating >= 3 ? stats(data).combo + 1 : 0
        const xp = [0, 0, 3, 5, 7][review.rating] + (review.rating >= 3 && review.durationMs < 3000 ? 2 : 0) + (combo >= 3 ? Math.min(combo, 10) : 0)
        data.reviews.push({ request: review, before, index: row.index, reinserted, xp, undone: false })
        card.schedule = review.schedule; row.index++; row.revision++; if (reinserted) row.ids.push(card.id)
        return { session: await snapshot(data, row, root, context), earnedXp: xp, replayed: false }
      }
      case 'undoReview': {
        const row = required(data.sessions.find(row => row.id === request.sessionId))
        const review = required([...data.reviews].reverse().find(review => !review.undone))
        if (review.request.reviewId !== request.reviewId || row.revision !== request.revision) throw new Error('Stale undo')
        const card = required(data.cards.find(card => card.id === review.request.cardId))
        card.schedule = { ...review.before, revision: card.schedule.revision + 1 }; review.undone = true
        if (review.reinserted) row.ids.splice(row.ids.lastIndexOf(card.id), 1)
        row.index = review.index; row.status = 'active'; row.revision++
        return snapshot(data, row, root, context)
      }
      default: throw new Error(`Unsupported QA learning operation: ${String(request.kind)}`)
    }
  }
  if (request.kind !== 'describe' && args.libraryId !== data.id) throw new Error('Library identity changed')
  const result = await call()
  if (changed) localStorage.setItem(`memnova:qa-learning:${root}`, JSON.stringify(data))
  return structuredClone(result)
}
