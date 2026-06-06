/**
 * useFlashcardSession.ts
 *
 * Orchestrates a FSRS study session:
 *  1. Computes the due queue from vault entries
 *  2. Schedules the next interval when user rates a card
 *  3. Persists the new FSRS state to frontmatter
 *  4. Logs the review to the JSONL log via Tauri
 *
 * Deck mode:
 *  - startSession(deckRoot) scopes the session to notes whose `belongsTo`
 *    references `deckRoot` (recursively via collectDeckMembers).
 *  - scheduleForReview(entry, 'deck') bulk-enables FSRS on all deck members.
 *
 * Usage:
 *   const session = useFlashcardSession({ entries, onUpdateFrontmatter })
 *   // session.dueEntries — cards to show
 *   // session.reviewCount — badge count for sidebar
 *   // session.handleRate(entry, rating) — process a rating
 *   // session.isActive — show FlashcardStudyView
 *   // session.startSession() / endSession()
 *   // session.startSession(deckRoot) — scoped deck session
 */

import { useCallback, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  getDueReviewEntries,
  getDueReviewCount,
  getFSRSCard,
  getFSRSFrontmatterPatch,
  getInitialFSRSPatch,
  isFSRSEnabled,
  collectDeckMembers,
  isFSRSEntryDue,
} from '../lib/fsrsVaultEntry'
import { fsrsSchedule } from '../lib/fsrs'
import type { FSRSRating } from '../lib/fsrs'
import type { VaultEntry } from '../types'
import type { FrontmatterValue } from '../components/Inspector'

interface UseFlashcardSessionOptions {
  entries: VaultEntry[]
  /** Tolaria's frontmatter update function — updates one key at a time */
  onUpdateFrontmatter: (path: string, key: string, value: FrontmatterValue, options?: Record<string, unknown>) => Promise<void>
  /** Callback to record XP & update gamification metrics */
  onRecordReview?: (rating: number, durationMs: number) => number
}

export interface FlashcardSession {
  /** Number of entries due today (for sidebar badge) — always vault-wide */
  reviewCount: number
  /** Ordered list of entries due for the current session (filtered by deckRoot if set) */
  dueEntries: VaultEntry[]
  /** Whether the study overlay is open */
  isActive: boolean
  /** The deck root if session was started with a deck scope, null for vault-wide sessions */
  deckRoot: VaultEntry | null
  /** Open the study session. Pass a deckRoot to scope the session to that deck. */
  startSession: (deckRoot?: VaultEntry) => void
  /** Close the study session and clear deck context */
  endSession: () => void
  /** Rate the current card and advance */
  handleRate: (entry: VaultEntry, rating: FSRSRating, durationMs?: number) => Promise<void>
  /**
   * Enable FSRS on a note.
   * - scope='self' (default): enable only on the given entry.
   * - scope='deck': enable on all entries whose `belongsTo` references the
   *   given entry (recursively), plus the entry itself if not yet enabled.
   */
  scheduleForReview: (entry: VaultEntry, scope?: 'self' | 'deck') => Promise<void>
}

export function useFlashcardSession({
  entries,
  onUpdateFrontmatter,
  onRecordReview,
}: UseFlashcardSessionOptions): FlashcardSession {
  const [isActive, setIsActive] = useState(false)
  const [deckRoot, setDeckRoot] = useState<VaultEntry | null>(null)
  // Entries injected immediately after scheduling (bypass vault re-index lag)
  const [immediateEntries, setImmediateEntries] = useState<VaultEntry[] | null>(null)

  const now = useMemo(() => new Date(), [])

  // Vault-wide due count (always unscoped — used for sidebar badge)
  const reviewCount = useMemo(() => getDueReviewCount(entries, now), [entries, now])

  // Due entries: use immediateEntries when set (right after scheduling),
  // otherwise scoped to deck when a deckRoot is set, otherwise vault-wide
  const dueEntries = useMemo(() => {
    if (immediateEntries) return immediateEntries
    const allDue = getDueReviewEntries(entries, now)
    if (!deckRoot) return allDue
    const members = collectDeckMembers(deckRoot, entries)
    const memberPaths = new Set(members.map((e) => e.path))
    return allDue.filter((e) => memberPaths.has(e.path))
  }, [entries, now, deckRoot, immediateEntries])

  const startSession = useCallback((root?: VaultEntry) => {
    setDeckRoot(root ?? null)
    setIsActive(true)
  }, [])

  const endSession = useCallback(() => {
    setIsActive(false)
    setDeckRoot(null)
    setImmediateEntries(null)
  }, [])

  /**
   * Write all FSRS frontmatter fields for a given schedule result.
   * Tolaria's onUpdateFrontmatter updates one key at a time, so we batch them.
   */
  const persistFSRSPatch = useCallback(
    async (path: string, patch: Record<string, string | number | boolean | null>) => {
      await Promise.all(
        Object.entries(patch).map(([key, value]) =>
          onUpdateFrontmatter(path, key, value as FrontmatterValue),
        ),
      )
    },
    [onUpdateFrontmatter],
  )

  const handleRate = useCallback(
    async (entry: VaultEntry, rating: FSRSRating, durationMs?: number) => {
      const card = getFSRSCard(entry)
      const ratingNow = new Date()
      const result = fsrsSchedule(card, rating, ratingNow)
      const patch = getFSRSFrontmatterPatch(result)

      // Record gamification stats
      if (onRecordReview) {
        onRecordReview(rating, durationMs ?? 0)
      }

      // Persist to frontmatter
      await persistFSRSPatch(entry.path, patch)

      // Append to review log (best-effort — don't block UI on failure)
      invoke('append_fsrs_review', {
        notePath: entry.path,
        rating,
        stateBefore: card.state,
        scheduledDays: result.scheduledDays,
      }).catch((err) => console.warn('[FSRS] Failed to append review log:', err))
    },
    [persistFSRSPatch, onRecordReview],
  )

  const scheduleForReview = useCallback(
    async (entry: VaultEntry, scope: 'self' | 'deck' = 'self') => {
      if (scope === 'self') {
        // Optimistically build a patched entry so we can start the session
        // immediately before the vault re-indexes the file
        const patch = getInitialFSRSPatch()
        const patchedEntry: VaultEntry = {
          ...entry,
          properties: { ...(entry.properties ?? {}), ...patch },
        }
        await persistFSRSPatch(entry.path, patch)
        setImmediateEntries([patchedEntry])
        setDeckRoot(null)
        setIsActive(true)
        return
      }

      // scope === 'deck': bulk-enable FSRS on all deck members
      const members = collectDeckMembers(entry, entries)

      // Enable FSRS on members that don't have it yet
      const toEnable = members.filter((m) => !isFSRSEnabled(m))
      await Promise.all(
        toEnable.map((m) => persistFSRSPatch(m.path, getInitialFSRSPatch())),
      )

      // Also enable the root entry itself if not yet enabled
      if (!isFSRSEnabled(entry)) {
        await persistFSRSPatch(entry.path, getInitialFSRSPatch())
      }

      // Build optimistic patched entries for immediate session start
      const patch = getInitialFSRSPatch()
      const patchedMembers = [
        ...(isFSRSEnabled(entry)
          ? []
          : [{ ...entry, properties: { ...(entry.properties ?? {}), ...patch } }]),
        ...toEnable.map((m) => ({
          ...m,
          properties: { ...(m.properties ?? {}), ...patch },
        })),
        // Include already-enabled members that are due
        ...members.filter((m) => isFSRSEnabled(m) && isFSRSEntryDue(m, new Date())),
      ]
      setImmediateEntries(patchedMembers.length > 0 ? patchedMembers : null)
      setDeckRoot(entry)
      setIsActive(true)
    },
    [entries, persistFSRSPatch],
  )

  return {
    reviewCount,
    dueEntries,
    isActive,
    deckRoot,
    startSession,
    endSession,
    handleRate,
    scheduleForReview,
  }
}
