/** Browser-only QA fixture. Native learning data always uses Rust/SQLite. */
import type { CardDraft, LearningCard, LearningPage, LearningSchedule, RateRequest, SessionScope, StudyPage, StudySession } from '../lib/learning/types'
import { splitFrontmatter } from '../utils/wikilinks'
import type { StudyStats } from '../hooks/useStats'
import type { VaultEntry } from '../types'

type FixtureSession = { id: string; scope: SessionScope; ids: string[]; initial: number; index: number; revision: number; status: StudySession['status'] }
type Receipt = { request: RateRequest; before: LearningSchedule; index: number; reinserted: boolean; xp: number; undone: boolean }
type Fixture = { id: string; pages: LearningPage[]; cards: LearningCard[]; sessions: FixtureSession[]; reviews: Receipt[]; goal: number }
type Context = { read: (path: string) => Promise<string>; entries: () => Promise<VaultEntry[]> }
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
async function source(root: string, page: LearningPage, context: Context): Promise<StudyPage> {
  const content = await context.read(`${root}/${page.path}`)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))
  return { ...page, content: splitFrontmatter(content)[1], fingerprint: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') }
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
  const pending = row.ids.slice(row.index).map((id, offset) => ({ card: data.cards.find(card => card.id === id), index: row.index + offset })).filter(item => item.card?.status === 'active' && (Date.parse(item.card.schedule.due) <= Date.now() || ['learning', 'relearning'].includes(item.card.schedule.state)))
  const ready = pending.find(item => item.card && Date.parse(item.card.schedule.due) <= Date.now())
  if (!pending.length) { row.status = 'completed'; row.index = row.ids.length }
  let current: StudySession['current'] = null
  if (ready?.card) {
    if (ready.index !== row.index) { [row.ids[ready.index], row.ids[row.index]] = [row.ids[row.index], row.ids[ready.index]]; row.revision++ }
    const page = data.pages.find(page => page.id === ready.card?.pageId)
    current = { card: ready.card, page: page ? await source(root, page, context) : null, sourceError: page ? null : 'Missing lesson' }
  }
  const reviews = data.reviews.filter(review => !review.undone && review.request.sessionId === row.id)
  const last = [...data.reviews].reverse().find(review => !review.undone)
  return { id: row.id, scope: row.scope, initialCount: row.initial, currentIndex: row.index, revision: row.revision, status: row.status, updatedAt: Date.now(), current, waitingUntil: current ? null : pending.length ? Math.min(...pending.map(item => Date.parse(item.card?.schedule.due ?? ''))) : null, completedCount: row.initial - pending.length, reviewCount: reviews.length, correctCount: reviews.filter(review => review.request.rating >= 3).length, lastReviewId: last?.request.sessionId === row.id ? last.request.reviewId : null, canUndo: last?.request.sessionId === row.id }
}
function required<T>(value: T | undefined): T { if (value === undefined) throw new Error('Missing QA learning record'); return value }
function draft(value: unknown): CardDraft {
  const result = value as CardDraft
  if (result.status === 'active' && (!result.front.trim() || (result.answerMode === 'inline' && !result.back.trim()))) throw new Error('An active card needs a question and an answer')
  return result
}

export async function mockLearningCommand(args: Record<string, unknown>, context: Context): Promise<unknown> {
  const root = String(args.vaultPath).replace(/\/$/, '')
  const data = fixture(root)
  const request = args.request as Record<string, unknown>
  let changed = !['describe', 'migrationStatus', 'listPages', 'listCards', 'studyStats', 'syncPages'].includes(String(request.kind))
  const call = async (): Promise<unknown> => {
    switch (request.kind) {
      case 'describe': return { libraryId: data.id, schemaVersion: 2, migrationState: 'ready' }
      case 'migrationStatus': return { state: 'ready', libraryId: data.id, backupId: null, totalPages: data.pages.length, importedPages: data.pages.length, totalCards: 0, importedCards: 0, importedReviews: 0 }
      case 'listPages': return data.pages
      case 'syncPages': {
        const entries = await context.entries()
        const byPath = new Map(data.pages.map(page => [page.path, page]))
        for (const entry of entries.filter(entry => entry.path.startsWith(`${root}/`) && /\.md$/i.test(entry.path))) {
          const path = entry.path.slice(root.length + 1)
          const existing = byPath.get(path)
          if (existing) { if (existing.title !== entry.title) { existing.title = entry.title; changed = true } }
          else { changed = true; data.pages.push({ id: crypto.randomUUID(), path, title: entry.title, available: true, createdAt: entry.createdAt, modifiedAt: entry.modifiedAt }) }
        }
        return data.pages
      }
      case 'ensurePage': {
        const path = String(request.path)
        let page = data.pages.find(page => page.path === path)
        if (!page) { page = { id: crypto.randomUUID(), path, title: path.split('/').pop()?.replace(/\.md$/, '') ?? path, available: true, createdAt: null, modifiedAt: null }; data.pages.push(page) }
        return page
      }
      case 'listCards': return data.cards.filter(card => (!request.pageId || card.pageId === request.pageId) && (request.includeTrashed || card.status !== 'trashed'))
      case 'createCard': case 'cloneCard': {
        const original = request.kind === 'cloneCard' ? required(data.cards.find(card => card.id === request.cardId)) : null
        if (original?.status === 'trashed') throw new Error('Restore a trashed card before cloning')
        const input = original ? { ...original, status: 'draft' as const } : draft(request.draft)
        const card: LearningCard = { ...input, pageId: original?.pageId ?? String(request.pageId), id: original ? crypto.randomUUID() : typeof request.operationId === 'string' ? request.operationId : crypto.randomUUID(), revision: 0, createdAt: Date.now(), updatedAt: Date.now(), schedule: fresh() }
        const existing = data.cards.find(value => value.id === card.id)
        if (existing) return existing
        data.cards.push(card); return card
      }
      case 'updateCard': {
        const card = required(data.cards.find(card => card.id === request.cardId))
        if (card.revision !== request.revision) throw new Error('Card changed; reload')
        const input = draft(request.draft)
        if (card.status === 'trashed' && (input.status !== 'draft' || ['front', 'back', 'answerMode', 'position', 'properties'].some(key => JSON.stringify(Reflect.get(input, key)) !== JSON.stringify(Reflect.get(card, key))))) throw new Error('Restore a trashed card to Draft before editing')
        Object.assign(card, input, { revision: card.revision + 1, updatedAt: Date.now() }); return card
      }
      case 'studyStats': return stats(data)
      case 'setDailyGoal': data.goal = Number(request.goal); return stats(data)
      case 'startSession': {
        const scope = request.scope as SessionScope
        const existing = data.sessions.find(row => row.status !== 'completed' && JSON.stringify(row.scope) === JSON.stringify(scope))
        if (existing) { existing.status = 'active'; return snapshot(data, existing, root, context) }
        const ids = data.cards.filter(card => card.status === 'active' && Date.parse(card.schedule.due) <= Date.now() && (scope.pageIds === null || scope.pageIds.includes(card.pageId))).map(card => card.id)
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
        if (current.current?.page?.fingerprint !== review.sourceFingerprint) throw new Error('Source changed')
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
