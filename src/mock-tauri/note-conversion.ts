/** Read-only browser text model. SQLite/raw numeric/media preservation is native QA. */
import type { Context, Fixture } from './learning'
import type { NoteConversionClassification, NoteConversionPage, NoteConversionPreview } from '../lib/learning/noteConversionTypes'
import { parseNoteMemoryDocument } from '../lib/learning/noteMemoryDocument'

type Hash = (value: string) => Promise<string>
function classify(page: NoteConversionPage, bound: boolean, pending: boolean): NoteConversionClassification {
  if (pending) return 'pending'
  if (page.issues.length) return 'invalid'
  if (bound) return 'bound'
  if (!page.candidates.length) return page.back !== null || page.propertiesRaw.includes('_fsrs_') ? 'legacyMarkdown' : 'ordinary'
  const live = page.candidates.filter(candidate => candidate.card.status !== 'trashed')
  if (!live.length) return 'trashed'
  if (live.length > 1) return 'multiple'
  const card = live[0].card
  if (card.answerMode === 'page') return 'wholePage'
  return card.front === page.front && card.back === page.back ? 'matching' : 'conflict'
}
async function projectPage(path: string, raw: string | null, data: Fixture | null, duplicate: boolean, hash: Hash): Promise<NoteConversionPage> {
  const registered = data?.pages.find(page => page.path === path)
  const document = raw === null ? null : parseNoteMemoryDocument(raw)
  const id = registered?.id ?? document?.pageId ?? null
  const binding = id ? data?.noteMemory?.bindings[id] : undefined
  const cards = data?.cards.filter(card => card.pageId === id && card.id !== binding?.cardId) ?? []
  const sessions = data?.sessions.filter(session => session.ids.some(cardId => data.cards.some(card => card.id === cardId && card.pageId === id))) ?? []
  const page: NoteConversionPage = {
    pageId: id, path, title: registered?.title ?? path, sourceHash: raw === null ? null : await hash(raw),
    front: document?.front ?? '', back: document?.ranges.back ? document.back : null, propertiesRaw: raw?.slice(0, document?.offsets.front.start ?? 0) ?? '', config: document?.config ?? null,
    classification: 'invalid', issues: [], candidates: [], suggestedReuseCardId: null, media: [], fingerprint: '',
    sessionFingerprint: await hash(JSON.stringify(sessions)), activeSessionCount: sessions.filter(session => session.status === 'active').length,
    pageStorageFingerprint: await hash(JSON.stringify({ registered, binding, hints: id ? data?.pageDefinitions?.[id] : null })),
  }
  if (!document) page.issues.push('missingSource')
  if (document?.issues.length) page.issues.push('invalidDocument')
  if (registered && registered.id !== document?.pageId) page.issues.push('changedIdentity')
  if (duplicate) page.issues.push('duplicateIdentity')
  for (const card of cards) {
    const reviews = data?.reviews.filter(review => review.request.cardId === card.id) ?? []
    page.candidates.push({ card: structuredClone(card), propertiesRaw: JSON.stringify(card.properties), reviewCount: reviews.length, undoneReviewCount: reviews.filter(review => review.undone).length, storageFingerprint: await hash(JSON.stringify({ card, reviews })) })
  }
  const pending = Object.values(data?.noteMemory?.operations ?? {}).some(operation => operation.pageId === id && operation.phase !== 'applied')
  page.classification = classify(page, Boolean(binding), pending)
  if (page.classification === 'matching') page.suggestedReuseCardId = cards.find(card => card.status !== 'trashed')?.id ?? null
  page.fingerprint = await hash(JSON.stringify(page))
  return page
}
export async function mockNoteConversionPreview(root: string, data: Fixture | null, context: Context, hash: Hash): Promise<NoteConversionPreview> {
  const entries = (await context.entries()).filter(entry => entry.path.startsWith(`${root}/`) && /\.(md|markdown)$/i.test(entry.path) && !entry.path.slice(root.length + 1).split('/').some(part => part.startsWith('.')))
  const paths = [...new Set([...entries.map(entry => entry.path.slice(root.length + 1)), ...(data?.pages.map(page => page.path) ?? [])])].sort()
  const files = new Map<string, string | null>()
  const identities = new Map<string, number>()
  for (const path of paths) {
    let raw: string | null = null
    try { raw = data?.restoredFiles?.[path] ?? await context.read(`${root}/${path}`) } catch { /* Retain the missing page in preview. */ }
    files.set(path, raw)
    const id = raw === null ? null : parseNoteMemoryDocument(raw).pageId
    if (id) identities.set(id, (identities.get(id) ?? 0) + 1)
  }
  const pages: NoteConversionPage[] = []
  for (const [path, raw] of files) {
    const id = raw === null ? null : parseNoteMemoryDocument(raw).pageId
    pages.push(await projectPage(path, raw, data, Boolean(id && (identities.get(id) ?? 0) > 1), hash))
  }
  const result: NoteConversionPreview = { version: 1, libraryId: data?.id ?? null, schemaVersion: data ? 5 : null, state: data ? 'ready' : 'importRequired', pages, fingerprint: '' }
  result.fingerprint = await hash(JSON.stringify(result))
  return result
}
