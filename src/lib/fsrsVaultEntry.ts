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
import type { VaultEntry, VaultPropertyValue } from '../types'
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
// Read helpers
// ---------------------------------------------------------------------------

function readBool(
  props: Record<string, VaultPropertyValue>,
  key: string,
): boolean {
  return props[key] === true
}

function readStr(
  props: Record<string, VaultPropertyValue>,
  key: string,
): string | null {
  const v = props[key]
  if (typeof v === 'string' && v.trim()) return v.trim()
  return null
}

function readNum(
  props: Record<string, VaultPropertyValue>,
  key: string,
  fallback = 0,
): number {
  const v = props[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const parsed = Number.parseFloat(v)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function readFSRSState(
  props: Record<string, VaultPropertyValue>,
): FSRSState {
  const v = readStr(props, FSRS_FIELD.state)
  if (v === 'learning' || v === 'review' || v === 'relearning') return v
  return 'new'
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if this note has FSRS scheduling enabled
 * (`_fsrs_enabled: true` in frontmatter).
 */
export function isFSRSEnabled(entry: VaultEntry): boolean {
  return readBool(entry.properties, FSRS_FIELD.enabled)
}

/**
 * Parse the FSRS scheduling state from a VaultEntry's properties.
 * Returns a default new card if fields are missing.
 */
export function getFSRSCard(entry: VaultEntry): FSRSCard {
  const props = entry.properties
  const now = new Date().toISOString()

  // If the entry has no FSRS fields at all, return a fresh card
  if (!props[FSRS_FIELD.state]) {
    return createNewFSRSCard(now)
  }

  return {
    state: readFSRSState(props),
    stability: readNum(props, FSRS_FIELD.stability),
    difficulty: readNum(props, FSRS_FIELD.difficulty),
    elapsedDays: readNum(props, FSRS_FIELD.elapsedDays),
    scheduledDays: readNum(props, FSRS_FIELD.scheduledDays),
    reps: readNum(props, FSRS_FIELD.reps),
    lapses: readNum(props, FSRS_FIELD.lapses),
    lastReview: readStr(props, FSRS_FIELD.lastReview),
    due: readStr(props, FSRS_FIELD.due) ?? now,
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
