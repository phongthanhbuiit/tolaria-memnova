import type { VaultEntry } from '../../types'
import type { LearningPage } from './types'
/** Atomic identity writes change file birth time; the recorded lesson date stays authoritative. */
export function withLearningPageDates(entries: VaultEntry[], pages: LearningPage[], root: string): VaultEntry[] {
  const dates = new Map(pages.filter(page => page.createdAt !== null).map(page => [`${root}/${page.path}`, page.createdAt]))
  return entries.map(entry => dates.has(entry.path) && dates.get(entry.path) !== entry.createdAt ? { ...entry, createdAt: dates.get(entry.path) ?? entry.createdAt } : entry)
}
