import type { VaultEntry } from '../../types'
import type { LearningPage } from './types'
import { collectDeckMembers } from '../fsrsVaultEntry'
export function learningPageScope(pageId: string, root: string, pages: LearningPage[], entries: VaultEntry[]): string[] {
  const page = pages.find(page => page.id === pageId)
  const entry = page ? entries.find(entry => entry.path === `${root}/${page.path}`) : null
  if (!entry) return [pageId]
  const paths = new Set([entry, ...collectDeckMembers(entry, entries)].map(entry => entry.path))
  return pages.filter(page => paths.has(`${root}/${page.path}`)).map(page => page.id)
}
