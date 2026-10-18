import { expect, it } from 'vitest'
import type { LearningCard, LearningPage, NoteLearningSummary } from './types'
import {
  noteFolderPaths,
  noteFolderScope,
  studyScopeForWorkspace,
  workspaceDue,
} from './noteWorkspace'

const pages = [
  { id: 'a', path: 'Biology/a.md', available: true },
  { id: 'b', path: 'Biology/Cells/b.md', available: true },
  { id: 'c', path: 'Biology-extra/c.md', available: true },
  { id: 'missing', path: 'Biology/missing.md', available: false },
] as LearningPage[]
it('never exposes internal retired-note or backup folders as study folders', () => {
  const hidden = {
    id: 'retired',
    path: '.memnova/retired/old.md',
    available: false,
  } as LearningPage
  expect(noteFolderPaths([...pages, hidden])).toEqual([
    'Biology',
    'Biology-extra',
    'Biology/Cells',
  ])
})
function card(id: string, pageId = 'a'): LearningCard {
  return {
    id,
    pageId,
    status: 'active',
    schedule: { due: new Date(0).toISOString() },
  } as LearningCard
}
function note(state: string, id: string, pageId = 'a'): NoteLearningSummary {
  return {
    view: { state, pageId, binding: { cardId: id } },
    card: card(id, pageId),
  } as NoteLearningSummary
}
it('defaults a compatible workspace to notes while preserving explicit old-card and empty scopes', () => {
  expect(studyScopeForWorkspace(true)).toEqual({ lane: 'notes', pageIds: null })
  expect(studyScopeForWorkspace(true, [], 'legacy')).toEqual({ pageIds: [] })
  expect(studyScopeForWorkspace(false)).toEqual({ pageIds: null })
})
it('counts only ready note cards, independently from old cards, without duplication', () => {
  const notes = [
    note('ready', 'n'),
    note('disabled', 'disabled'),
    note('invalid', 'invalid'),
    note('pending', 'pending'),
    note('ready', 'gone', 'missing'),
  ]
  const due = workspaceDue(pages, notes, [card('old'), card('n')], Date.now())
  expect(due.notes.map((value) => value.id)).toEqual(['n'])
  expect(due.legacy.map((value) => value.id)).toEqual(['old'])
})
it('scopes folders by path boundaries and explicit recursive choice, never by Markdown links', () => {
  expect(noteFolderScope('Biology', pages, true)).toEqual(['a', 'b'])
  expect(noteFolderScope('Biology', pages, false)).toEqual(['a'])
  expect(noteFolderScope('', pages, true)).toEqual(['a', 'b', 'c'])
  expect(() => noteFolderScope('../', pages)).toThrow('Invalid note folder')
})
