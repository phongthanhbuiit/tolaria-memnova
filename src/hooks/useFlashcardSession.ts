/**
 * useFlashcardSession.ts
 *
 * Orchestrates a FSRS study session:
 *  1. Computes the due queue from vault entries
 *  2. Schedules the next interval when user rates a card
 *  3. Persists the new FSRS state to frontmatter
 *  4. Logs the review to the JSONL log via Tauri
 *
 * Usage:
 *   const session = useFlashcardSession({ entries, onUpdateFrontmatter })
 *   // session.dueEntries — cards to show
 *   // session.reviewCount — badge count for sidebar
 *   // session.handleRate(entry, rating) — process a rating
 *   // session.isActive — show FlashcardStudyView
 *   // session.startSession() / endSession()
 */

import { useCallback, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  getDueReviewEntries,
  getDueReviewCount,
  getFSRSCard,
  getFSRSFrontmatterPatch,
  getInitialFSRSPatch,
} from '../lib/fsrsVaultEntry'
import { fsrsSchedule } from '../lib/fsrs'
import type { FSRSRating } from '../lib/fsrs'
import type { VaultEntry } from '../types'
import type { FrontmatterValue } from '../components/Inspector'

interface UseFlashcardSessionOptions {
  entries: VaultEntry[]
  /** Tolaria's frontmatter update function — updates one key at a time */
  onUpdateFrontmatter: (path: string, key: string, value: FrontmatterValue, options?: Record<string, unknown>) => Promise<void>
}

export interface FlashcardSession {
  /** Number of entries due today (for sidebar badge) */
  reviewCount: number
  /** Ordered list of entries due for the current session */
  dueEntries: VaultEntry[]
  /** Whether the study overlay is open */
  isActive: boolean
  /** Open the study session */
  startSession: () => void
  /** Close the study session */
  endSession: () => void
  /** Rate the current card and advance */
  handleRate: (entry: VaultEntry, rating: FSRSRating) => Promise<void>
  /** Enable FSRS on a note (called from BreadcrumbBar "Schedule" button) */
  scheduleForReview: (entry: VaultEntry) => Promise<void>
}

export function useFlashcardSession({
  entries,
  onUpdateFrontmatter,
}: UseFlashcardSessionOptions): FlashcardSession {
  const [isActive, setIsActive] = useState(false)

  const now = useMemo(() => new Date(), [])

  const dueEntries = useMemo(() => getDueReviewEntries(entries, now), [entries, now])
  const reviewCount = useMemo(() => getDueReviewCount(entries, now), [entries, now])

  const startSession = useCallback(() => {
    setIsActive(true)
  }, [])

  const endSession = useCallback(() => {
    setIsActive(false)
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
    async (entry: VaultEntry, rating: FSRSRating) => {
      const card = getFSRSCard(entry)
      const now = new Date()
      const result = fsrsSchedule(card, rating, now)
      const patch = getFSRSFrontmatterPatch(result)

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
    [persistFSRSPatch],
  )

  const scheduleForReview = useCallback(
    async (entry: VaultEntry) => {
      const patch = getInitialFSRSPatch()
      await persistFSRSPatch(entry.path, patch)
    },
    [persistFSRSPatch],
  )

  return {
    reviewCount,
    dueEntries,
    isActive,
    startSession,
    endSession,
    handleRate,
    scheduleForReview,
  }
}
