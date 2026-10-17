/** Legacy note scheduling bridge retained until SQLite migration is confirmed. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { collectDeckMembers, getDueReviewEntries, getFSRSCard, getFSRSFrontmatterPatch, getInitialFSRSPatch, isFSRSEnabled } from '../lib/fsrsVaultEntry'
import { fsrsSchedule, type FSRSRating } from '../lib/fsrs'
import { frontmatterToEntryPatch } from './frontmatterOps'
import type { VaultEntry } from '../types'

export type SchedulePatch = Record<string, string | number | boolean | null>
interface UseFlashcardSessionOptions {
  entries: VaultEntry[]
  onPersistSchedule: (path: string, patch: SchedulePatch) => Promise<void>
  onRecordReview?: (rating: number, durationMs: number) => number
}

export interface FlashcardSession {
  reviewCount: number
  dueEntries: VaultEntry[]
  isActive: boolean
  deckRoot: VaultEntry | null
  startSession: (deckRoot?: VaultEntry) => void
  endSession: () => void
  handleRate: (entry: VaultEntry, rating: FSRSRating, durationMs?: number) => Promise<void>
  scheduleForReview: (entry: VaultEntry, scope?: 'self' | 'deck') => Promise<void>
}

function patchedEntry(entry: VaultEntry, patch: SchedulePatch): VaultEntry {
  const fields = Object.entries(patch).map(([key, value]) => frontmatterToEntryPatch('update', key, value).patch)
  return Object.assign({}, entry, ...fields)
}

export function useFlashcardSession({ entries, onPersistSchedule, onRecordReview }: UseFlashcardSessionOptions): FlashcardSession {
  const [isActive, setIsActive] = useState(false)
  const [deckRoot, setDeckRoot] = useState<VaultEntry | null>(null)
  const [overrides, setOverrides] = useState<Record<string, VaultEntry>>({})
  const [now, setNow] = useState(() => new Date())
  const merged = useMemo(() => entries.map(entry => overrides[entry.path] ?? entry), [entries, overrides])
  useEffect(() => {
    const nextDue = merged.reduce((next, entry) => {
      if (!isFSRSEnabled(entry)) return next
      const due = Date.parse(entry.fsrsDue ?? '')
      return Number.isFinite(due) && due > now.getTime() ? Math.min(next, due) : next
    }, Date.now() + 60_000)
    const timer = setTimeout(() => setNow(new Date()), Math.max(1, nextDue - Date.now()))
    return () => clearTimeout(timer)
  }, [merged, now])
  const allDue = useMemo(() => getDueReviewEntries(merged, now), [merged, now])
  const dueEntries = useMemo(() => {
    if (!deckRoot) return allDue
    const members = new Set([deckRoot.path, ...collectDeckMembers(deckRoot, merged).map(e => e.path)])
    return allDue.filter(e => members.has(e.path))
  }, [allDue, deckRoot, merged])

  const startSession = useCallback((root?: VaultEntry) => {
    setNow(new Date())
    setDeckRoot(root ?? null)
    setIsActive(true)
  }, [])
  const endSession = useCallback(() => {
    setIsActive(false)
    setDeckRoot(null)
  }, [])
  const persist = useCallback(async (entry: VaultEntry, patch: SchedulePatch) => {
    await onPersistSchedule(entry.path, patch)
    setOverrides(previous => ({ ...previous, [entry.path]: patchedEntry(entry, patch) }))
    setNow(new Date())
  }, [onPersistSchedule])

  const handleRate = useCallback(async (entry: VaultEntry, rating: FSRSRating, durationMs?: number) => {
    const card = getFSRSCard(entry)
    const result = fsrsSchedule(card, rating, new Date())
    await persist(entry, getFSRSFrontmatterPatch(result))
    onRecordReview?.(rating, durationMs ?? 0)
    invoke('append_fsrs_review', {
      notePath: entry.path, rating, stateBefore: card.state, scheduledDays: result.scheduledDays,
    }).catch(error => console.warn('[FSRS] Failed to append legacy review log:', error))
  }, [persist, onRecordReview])

  const scheduleForReview = useCallback(async (entry: VaultEntry, scope: 'self' | 'deck' = 'self') => {
    const candidates = scope === 'deck' ? [entry, ...collectDeckMembers(entry, merged)] : [entry]
    // Enabling is idempotent; resetting scheduling requires a separate explicit action.
    for (const candidate of candidates) {
      const current = overrides[candidate.path] ?? candidate
      if (!isFSRSEnabled(current)) await persist(current, getInitialFSRSPatch())
    }
    startSession(scope === 'deck' ? entry : undefined)
    if (scope === 'self') setDeckRoot(entry)
  }, [merged, overrides, persist, startSession])

  return { reviewCount: allDue.length, dueEntries, isActive, deckRoot, startSession, endSession, handleRate, scheduleForReview }
}
