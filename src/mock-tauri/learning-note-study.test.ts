import { expect, it } from 'vitest'
import { mockLearningCommand } from './learning'
import { scheduleReview } from '../lib/learning/scheduler'
import type { NoteMemoryView, RateRequest, StudySession } from '../lib/learning/types'
const owner = '00000000-0000-0000-0000-000000000001'
const target = '00000000-0000-0000-0000-000000000002'
async function fixture(linked = false) {
  const root = `/qa/note-study-${crypto.randomUUID()}`
  const files = new Map([[`${root}/owner.md`, `---\n_memnova_page_id: ${owner}\n---\nArticle\n<!-- FLASHCARD:BACK -->\nMnemonic\n`], [`${root}/target.md`, `---\n_memnova_page_id: ${target}\n---\nTarget article\n<!-- FLASHCARD:BACK -->\nHidden target back\n`]])
  const context = { read: async (path: string) => { const value = files.get(path); if (value === undefined) throw Error('Missing source'); return value }, write: async (path: string, value: string) => { files.set(path, value) }, entries: async () => [] }
  const descriptor = await mockLearningCommand({ vaultPath: root, request: { kind: 'describe' } }, context) as { libraryId: string }
  const call = (request: Record<string, unknown>) => mockLearningCommand({ vaultPath: root, libraryId: descriptor.libraryId, request }, context)
  for (const path of ['owner.md', 'target.md']) await call({ kind: 'ensurePage', path })
  const state = await call({ kind: 'readNoteMemory', pageId: owner }) as NoteMemoryView
  await call({ kind: 'configureNoteMemory', request: { operationId: crypto.randomUUID(), pageId: owner, expectedHash: state.sourceHash, expectedRevision: null, config: { version: 1, enabled: true, back: linked ? { kind: 'page', pageId: target, face: 'front' } : { kind: 'inline' } } } })
  const session = await call({ kind: 'startSession', scope: { pageIds: [owner], lane: 'notes' } }) as StudySession
  return { root, files, call, session }
}
function review(session: StudySession): RateRequest {
  const item = session.current!
  const now = new Date()
  return { reviewId: crypto.randomUUID(), sessionId: session.id, sessionRevision: session.revision, cardId: item.card.id, cardRevision: item.card.revision, sourceFingerprint: item.page!.fingerprint, ...(item.answerPage ? { answerFingerprint: item.answerPage.fingerprint } : {}), rating: 3, durationMs: 1000, reviewedAt: now.getTime(), schedule: scheduleReview(item.card.schedule, 3, now) }
}
it('projects both live note faces and previews one source face without SQL content fallback', async () => {
  const { call, session } = await fixture()
  expect(session.current).toMatchObject({ content: { kind: 'note' }, page: { content: 'Article\n' }, answerPage: { content: 'Mnemonic\n' } })
  expect(await call({ kind: 'readNoteFace', pageId: target, face: 'front' })).toMatchObject({ content: 'Target article\n', face: 'front' })
  expect(await call({ kind: 'readNoteMemory', pageId: target })).toMatchObject({ binding: null, schedule: null })
})
it('invalidates a linked source edit and keeps the target schedule independent', async () => {
  const { root, files, call, session } = await fixture(true)
  expect(session.initialCount).toBe(1)
  expect(session.current?.answerPage?.content).toBe('Target article\n')
  const request = review(session)
  files.set(`${root}/target.md`, files.get(`${root}/target.md`)!.replace('Target article', 'New target'))
  await expect(call({ kind: 'rateCard', review: request })).rejects.toThrow('Source changed')
  expect(await call({ kind: 'readNoteMemory', pageId: owner })).toMatchObject({ schedule: { reps: 0 } })
  expect(await call({ kind: 'readNoteMemory', pageId: target })).toMatchObject({ binding: null, schedule: null })
})
it('replays committed review receipts after source removal without another review', async () => {
  const { root, files, call, session } = await fixture()
  const request = review(session)
  const saved = await call({ kind: 'rateCard', review: request }) as { earnedXp: number }
  files.delete(`${root}/owner.md`)
  expect(await call({ kind: 'rateCard', review: request })).toMatchObject({ replayed: true, earnedXp: saved.earnedXp })
})

it('separates global note and old-card lanes, with old saved scopes retaining legacy semantics', async () => {
 const {call}=await fixture()
 await call({kind:'createCard',pageId:target,draft:{front:'Old question',back:'Old answer',answerMode:'inline',status:'active',position:0,properties:{}}})
 for(const lane of ['notes','legacy',undefined]) {
  const scope={pageIds:null,...(lane?{lane}:{})}
  const session=await call({kind:'startSession',scope}) as StudySession
  expect(session.initialCount).toBe(1)
  expect(session.current?.card.pageId).toBe(lane==='notes'?owner:target)
 }
 expect(await call({kind:'readNoteMemory',pageId:target})).toMatchObject({binding:null,schedule:null})
})
