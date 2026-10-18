import { normalizeSessionScope } from './sessionScope'
import type {
  LearningCard,
  LearningPage,
  NoteLearningSummary,
  StudyLane,
} from './types'

export function studyScopeForWorkspace(
  supported: boolean,
  pageIds?: string[],
  lane?: StudyLane
) {
  return normalizeSessionScope({
    pageIds: pageIds ?? null,
    lane: lane ?? (supported ? 'notes' : 'legacy'),
  })
}

export function workspaceDue(
  pages: LearningPage[],
  summaries: NoteLearningSummary[],
  oldCards: LearningCard[],
  clock: number
) {
  const available = new Set(
    pages.filter((page) => page.available).map((page) => page.id)
  )
  const bound = new Set(
    summaries.flatMap((row) =>
      row.view.binding ? [row.view.binding.cardId] : []
    )
  )
  const due = (card: LearningCard) =>
    available.has(card.pageId) &&
    card.status === 'active' &&
    Date.parse(card.schedule.due) <= clock
  return {
    notes: summaries.flatMap((row) =>
      row.view.state === 'ready' && row.card && due(row.card) ? [row.card] : []
    ),
    legacy: oldCards.filter((card) => !bound.has(card.id) && due(card)),
  }
}

/** Folder scope is explicit filesystem membership, independent of article/source links. */
export function noteFolderScope(
  folder: string,
  pages: LearningPage[],
  recursive = true
): string[] {
  const normalized = folder.replace(/\/$/, '')
  if (
    normalized.startsWith('/') ||
    normalized.includes('\\') ||
    normalized.split('/').some((part) => part === '.' || part === '..')
  )
    throw Error('Invalid note folder')
  const prefix = normalized ? `${normalized}/` : ''
  return pages
    .filter(
      (page) =>
        page.available &&
        page.path.startsWith(prefix) &&
        (recursive || !page.path.slice(prefix.length).includes('/'))
    )
    .map((page) => page.id)
}
