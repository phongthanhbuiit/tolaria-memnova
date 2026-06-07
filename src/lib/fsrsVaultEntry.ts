/**
 * fsrsVaultEntry.ts
 *
 * Bridges between Tolaria's VaultEntry (frontmatter-backed) and the FSRS engine.
 *
 * Convention:
 *   - FSRS activation flag  : `_fsrs_enabled` (boolean true)
 *   - FSRS scheduling fields: `_fsrs_state`, `_fsrs_due`, `_fsrs_stability`,
 *                             `_fsrs_difficulty`, `_fsrs_elapsed_days`,
 *                             `_fsrs_scheduled_days`, `_fsrs_reps`,
 *                             `_fsrs_lapses`, `_fsrs_last_review`
 *
 * The underscore prefix follows Tolaria's convention for system/internal fields.
 */

import {
  createNewFSRSCard,
  isFSRSCardDue,
  type FSRSCard,
  type FSRSScheduleResult,
  type FSRSState,
} from './fsrs'
import type { VaultEntry } from '../types'
import { refMatchesEntry } from '../utils/noteListHelpers'

// ---------------------------------------------------------------------------
// FSRS frontmatter field names
// ---------------------------------------------------------------------------

export const FSRS_FIELD = {
  enabled: '_fsrs_enabled',
  state: '_fsrs_state',
  due: '_fsrs_due',
  stability: '_fsrs_stability',
  difficulty: '_fsrs_difficulty',
  elapsedDays: '_fsrs_elapsed_days',
  scheduledDays: '_fsrs_scheduled_days',
  reps: '_fsrs_reps',
  lapses: '_fsrs_lapses',
  lastReview: '_fsrs_last_review',
} as const

// Marker comment that splits front/back in markdown
export const FLASHCARD_BACK_MARKER = '<!-- FLASHCARD:BACK -->'

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if this note has FSRS scheduling enabled
 * (`_fsrs_enabled: true` in frontmatter).
 *
 * Reads from the dedicated `fsrsEnabled` field on VaultEntry (set by the Rust
 * vault parser) rather than `entry.properties`, because the Rust parser filters
 * all `_`-prefixed keys out of `properties` unless they are explicitly registered
 * as known system fields that populate dedicated struct fields.
 */
export function isFSRSEnabled(entry: VaultEntry): boolean {
  return entry.fsrsEnabled === true
}

/**
 * Parse the FSRS scheduling state from a VaultEntry's properties.
 * Returns a default new card if fields are missing.
 */
export function getFSRSCard(entry: VaultEntry): FSRSCard {
  const now = new Date().toISOString()

  // If the entry has no FSRS state, return a fresh card
  if (!entry.fsrsState) {
    return createNewFSRSCard(now)
  }

  const state = entry.fsrsState
  const validState: FSRSState =
    state === 'learning' || state === 'review' || state === 'relearning' ? state : 'new'

  return {
    state: validState,
    stability: entry.fsrsStability ?? 0,
    difficulty: entry.fsrsDifficulty ?? 0,
    elapsedDays: entry.fsrsElapsedDays ?? 0,
    scheduledDays: entry.fsrsScheduledDays ?? 0,
    reps: entry.fsrsReps ?? 0,
    lapses: entry.fsrsLapses ?? 0,
    lastReview: entry.fsrsLastReview ?? null,
    due: entry.fsrsDue ?? now,
  }
}

/**
 * Returns true if the note's FSRS card is due on or before `now`.
 */
export function isFSRSEntryDue(entry: VaultEntry, now: Date = new Date()): boolean {
  if (!isFSRSEnabled(entry)) return false
  return isFSRSCardDue(getFSRSCard(entry), now)
}

/**
 * Returns all entries that have FSRS enabled and are due for review.
 * Sort order: new → learning/relearning → review, then by due date ascending.
 */
export function getDueReviewEntries(
  entries: VaultEntry[],
  now: Date = new Date(),
): VaultEntry[] {
  return entries
    .filter((e) => isFSRSEntryDue(e, now))
    .sort((a, b) => {
      const ca = getFSRSCard(a)
      const cb = getFSRSCard(b)
      const stateOrder: Record<FSRSState, number> = {
        new: 0,
        learning: 1,
        relearning: 2,
        review: 3,
      }
      const so = stateOrder[ca.state] - stateOrder[cb.state]
      if (so !== 0) return so
      return new Date(ca.due).getTime() - new Date(cb.due).getTime()
    })
}

/**
 * Returns the count of entries due for review today.
 */
export function getDueReviewCount(
  entries: VaultEntry[],
  now: Date = new Date(),
): number {
  return entries.filter((e) => isFSRSEntryDue(e, now)).length
}

/**
 * Build a frontmatter patch object from an FSRSScheduleResult.
 * Pass this to the `update_frontmatter` Tauri command.
 *
 * Note: Each field must be patched individually via Tolaria's
 * `update_frontmatter` command (one key-value pair per call).
 * This helper returns all the fields to update as a map.
 */
export function getFSRSFrontmatterPatch(
  result: FSRSScheduleResult,
): Record<string, string | number | boolean | null> {
  const { card } = result
  return {
    [FSRS_FIELD.state]: card.state,
    [FSRS_FIELD.due]: card.due,
    [FSRS_FIELD.stability]: card.stability,
    [FSRS_FIELD.difficulty]: card.difficulty,
    [FSRS_FIELD.elapsedDays]: card.elapsedDays,
    [FSRS_FIELD.scheduledDays]: card.scheduledDays,
    [FSRS_FIELD.reps]: card.reps,
    [FSRS_FIELD.lapses]: card.lapses,
    [FSRS_FIELD.lastReview]: card.lastReview,
  }
}

/**
 * Build a frontmatter patch to initialise FSRS on a note.
 * Used when the user clicks "Schedule for Review" for the first time.
 */
export function getInitialFSRSPatch(): Record<string, string | number | boolean | null> {
  const now = new Date().toISOString()
  const fresh = createNewFSRSCard(now)
  return {
    [FSRS_FIELD.enabled]: true,
    [FSRS_FIELD.state]: fresh.state,
    [FSRS_FIELD.due]: fresh.due,
    [FSRS_FIELD.stability]: fresh.stability,
    [FSRS_FIELD.difficulty]: fresh.difficulty,
    [FSRS_FIELD.elapsedDays]: fresh.elapsedDays,
    [FSRS_FIELD.scheduledDays]: fresh.scheduledDays,
    [FSRS_FIELD.reps]: fresh.reps,
    [FSRS_FIELD.lapses]: fresh.lapses,
    [FSRS_FIELD.lastReview]: fresh.lastReview,
  }
}

/**
 * Collect all vault entries that are members of the deck rooted at `root`.
 *
 * A note is a deck member if its `belongsTo` field references `root` (or any
 * descendant of `root` that is itself a member). The root entry itself is NOT
 * included in the result.
 *
 * Uses BFS + a visited-path Set to prevent infinite loops from circular
 * belongsTo references.
 *
 * Design note: only `belongsTo` determines deck membership. Body wikilinks
 * (`outgoingLinks`) are intentionally ignored — they are content references,
 * not structural deck relationships.
 */
export function collectDeckMembers(
  root: VaultEntry,
  allEntries: VaultEntry[],
): VaultEntry[] {
  const visited = new Set<string>()
  visited.add(root.path)

  const result: VaultEntry[] = []
  const queue: VaultEntry[] = [root]

  while (queue.length > 0) {
    const current = queue.shift()!

    const children = allEntries.filter(
      (e) =>
        !visited.has(e.path) &&
        e.belongsTo.some((ref) => refMatchesEntry(ref, current)),
    )

    for (const child of children) {
      visited.add(child.path)
      result.push(child)
      queue.push(child)
    }
  }

  return result
}
