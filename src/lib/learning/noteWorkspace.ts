import { joinVaultPath, normalizeNotePathForIdentity } from '../../utils/notePathIdentity'
import { normalizeSessionScope } from './sessionScope'
import type {
  LearningCard,
  LearningPage,
  NoteLearningSummary,
  StudyLane,
} from './types'

/** Metadata records stay in storage; user-facing catalogs must not index their paths. */
export function isPublicNotePath(path: string): boolean {
  return !path.replaceAll('\\', '/').split('/').some(part => part.toLowerCase() === '.memnova')
}

export function noteFolderPaths(pages: LearningPage[]): string[] {
  const folders = new Set<string>()
  for (const page of pages) {
    const parts = page.path.split('/')
    if (parts.some((part) => part.startsWith('.'))) continue
    for (let depth = 1; depth < parts.length; depth++)
      folders.add(parts.slice(0, depth).join('/'))
  }
  return [...folders].sort()
}

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
    pages.filter((page) => page.available && isPublicNotePath(page.path)).map((page) => page.id)
  )
  const bound = new Set(
    summaries.flatMap((row) =>
      row.view.binding ? [row.view.binding.cardId] : []
    )
  )
  const active = (card: LearningCard) => available.has(card.pageId) && card.status === 'active'
  const due = (card: LearningCard) => Date.parse(card.schedule.due) <= clock
  const readyNotes = summaries.flatMap(row =>
    row.view.state === 'ready' && row.card && active(row.card) ? [row.card] : [],
  )
  return {
    readyNotes,
    notes: readyNotes.filter(due),
    legacy: oldCards.filter((card) => !bound.has(card.id) && active(card) && due(card)),
  }
}

export type ResolveViewStudyScope = (readyByPath: ReadonlyMap<string, string>) => string[]

export function notePathsForCards(root: string, pages: LearningPage[], cards: LearningCard[]): ReadonlyMap<string, string> {
  const ids = new Set(cards.map(card => card.pageId))
  return new Map(pages.filter(page => ids.has(page.id)).map(page =>
    [normalizeNotePathForIdentity(joinVaultPath(root, page.path)), page.id],
  ))
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
        isPublicNotePath(page.path) &&
        page.path.startsWith(prefix) &&
        (recursive || !page.path.slice(prefix.length).includes('/'))
    )
    .map((page) => page.id)
}
