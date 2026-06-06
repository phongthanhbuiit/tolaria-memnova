/**
 * FSRS v5 — Free Spaced Repetition Scheduler
 *
 * Port of the FSRS-5 algorithm for scheduling flashcard reviews.
 * Reference: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 *
 * Zero external dependencies — pure TypeScript.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FSRSState = 'new' | 'learning' | 'review' | 'relearning'

/** 1=Again, 2=Hard, 3=Good, 4=Easy */
export type FSRSRating = 1 | 2 | 3 | 4

export interface FSRSCard {
  state: FSRSState
  /** Stability in days — number of days for retention to fall to 90% */
  stability: number
  /** Difficulty [1, 10] */
  difficulty: number
  /** Number of successful reviews */
  reps: number
  /** Number of lapses (forgotten reviews) */
  lapses: number
  /** Elapsed days since the last review */
  elapsedDays: number
  /** Scheduled days for the next interval */
  scheduledDays: number
  /** ISO date string of the last review, or null if never reviewed */
  lastReview: string | null
  /** ISO date string of the next due date */
  due: string
}

export interface FSRSScheduleResult {
  card: FSRSCard
  /** Scheduled interval in days */
  scheduledDays: number
  /** The rating used */
  rating: FSRSRating
}

// ---------------------------------------------------------------------------
// FSRS-5 Default Parameters (19 weights)
// ---------------------------------------------------------------------------

const W: readonly number[] = [
  0.40255, // w0  — initial stability for Again
  1.18385, // w1  — initial stability for Hard
  3.17305, // w2  — initial stability for Good
  15.69105, // w3  — initial stability for Easy
  7.1949,  // w4  — initial difficulty base
  0.5345,  // w5  — initial difficulty rating scale
  1.4604,  // w6  — difficulty change weight
  0.0046,  // w7  — difficulty stabilisation
  1.54575, // w8  — stability growth factor (recall)
  0.1192,  // w9  — stability decay (recall)
  1.01925, // w10 — retrievability factor (recall)
  1.9395,  // w11 — forget stability base
  0.11,    // w12 — difficulty factor (forget)
  0.29605, // w13 — stability growth (forget)
  2.2698,  // w14 — retrievability factor (forget)
  0.2315,  // w15 — hard penalty
  2.9898,  // w16 — easy bonus
  0.51655, // w17 — short-term stability modifier
  0.6621,  // w18 — long-term stability modifier
]

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DECAY = -0.5
const FACTOR = 19 / 81
const REQUEST_RETENTION = 0.9

// Learning steps: minutes until graduating to review state
const LEARNING_STEPS_MINUTES = [1, 10]
const RELEARNING_STEPS_MINUTES = [10]

// ---------------------------------------------------------------------------
// Core math
// ---------------------------------------------------------------------------

/**
 * Forgetting curve: probability of recall after `t` days given stability `s`.
 * R(t, S) = (1 + FACTOR * t / S)^DECAY
 */
export function forgettingCurve(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY)
}

/**
 * Next interval in days to achieve target retention.
 * interval = S/FACTOR * (R^(1/DECAY) - 1)
 */
function nextInterval(stability: number, retention: number = REQUEST_RETENTION): number {
  const interval = (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1)
  return Math.max(1, Math.round(interval))
}

// ---------------------------------------------------------------------------
// Initial card parameters
// ---------------------------------------------------------------------------

/** Initial stability for a new card, based on first rating. */
function initialStability(rating: FSRSRating): number {
  return W[rating - 1]
}

/** Initial difficulty [1, 10] for a new card, based on first rating. */
function initialDifficulty(rating: FSRSRating): number {
  const d = W[4] - Math.exp(W[5] * (rating - 1)) + 1
  return Math.min(10, Math.max(1, d))
}

// ---------------------------------------------------------------------------
// State-update formulas
// ---------------------------------------------------------------------------

/** Mean-reversion difficulty update after a review. */
function nextDifficulty(d: number, rating: FSRSRating): number {
  const deltaD = -W[6] * (rating - 3)
  const meanReversion = W[7] * (initialDifficulty(4) - d)
  return Math.min(10, Math.max(1, d + deltaD + meanReversion))
}

/** Stability after a successful recall review. */
function nextRecallStability(
  d: number,
  s: number,
  r: number,
  rating: FSRSRating,
): number {
  const hardPenalty = rating === 2 ? W[15] : 1
  const easyBonus = rating === 4 ? W[16] : 1
  return (
    s *
    (Math.exp(W[8]) *
      (11 - d) *
      Math.pow(s, -W[9]) *
      (Math.exp(W[10] * (1 - r)) - 1) *
      hardPenalty *
      easyBonus +
      1)
  )
}

/** Stability after a lapse (Again rating on a review card). */
function nextForgetStability(d: number, s: number, r: number): number {
  return (
    W[11] *
    Math.pow(d, -W[12]) *
    (Math.pow(s + 1, W[13]) - 1) *
    Math.exp(W[14] * (1 - r))
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create a brand-new FSRS card with default state. */
export function createNewFSRSCard(nowISO?: string): FSRSCard {
  const now = nowISO ?? new Date().toISOString()
  return {
    state: 'new',
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    lastReview: null,
    due: now,
  }
}

/**
 * Schedule a card after a review.
 *
 * @param card   Current card state
 * @param rating User rating (1=Again, 2=Hard, 3=Good, 4=Easy)
 * @param now    Review timestamp (defaults to current time)
 * @returns      New card state + scheduled interval
 */
export function fsrsSchedule(
  card: FSRSCard,
  rating: FSRSRating,
  now: Date = new Date(),
): FSRSScheduleResult {
  const nowISO = now.toISOString()
  const elapsedDays = card.lastReview
    ? Math.max(0, Math.round((now.getTime() - new Date(card.lastReview).getTime()) / 86_400_000))
    : 0

  let newCard: FSRSCard

  switch (card.state) {
    case 'new': {
      const s = initialStability(rating)
      const d = initialDifficulty(rating)

      if (rating === 1) {
        // Again on new card → stay in learning, due in 1 min
        newCard = {
          ...card,
          state: 'learning',
          stability: s,
          difficulty: d,
          reps: card.reps + 1,
          elapsedDays,
          scheduledDays: 0,
          lastReview: nowISO,
          due: minutesLater(now, LEARNING_STEPS_MINUTES[0]),
        }
      } else {
        // Hard/Good/Easy on new card → graduate immediately to review
        const interval = rating === 4 ? Math.max(4, nextInterval(s)) : Math.max(1, nextInterval(s))
        newCard = {
          ...card,
          state: 'review',
          stability: s,
          difficulty: d,
          reps: card.reps + 1,
          lapses: card.lapses,
          elapsedDays,
          scheduledDays: interval,
          lastReview: nowISO,
          due: daysLater(now, interval),
        }
      }
      break
    }

    case 'learning':
    case 'relearning': {
      const steps = card.state === 'learning' ? LEARNING_STEPS_MINUTES : RELEARNING_STEPS_MINUTES

      if (rating === 1) {
        // Again → restart learning from first step
        newCard = {
          ...card,
          reps: card.reps + 1,
          lapses: card.lapses + 1,
          elapsedDays,
          scheduledDays: 0,
          lastReview: nowISO,
          due: minutesLater(now, steps[0]),
        }
      } else {
        // Good/Easy → graduate to review
        const s = card.stability > 0 ? card.stability : initialStability(rating)
        const d = card.difficulty > 0 ? card.difficulty : initialDifficulty(rating)
        const interval = rating === 4 ? Math.max(4, nextInterval(s)) : Math.max(1, nextInterval(s))
        newCard = {
          ...card,
          state: 'review',
          stability: s,
          difficulty: d,
          reps: card.reps + 1,
          elapsedDays,
          scheduledDays: interval,
          lastReview: nowISO,
          due: daysLater(now, interval),
        }
      }
      break
    }

    case 'review': {
      const r = forgettingCurve(elapsedDays, card.stability)
      const d = nextDifficulty(card.difficulty, rating)

      if (rating === 1) {
        // Lapse — move to relearning
        const s = nextForgetStability(card.difficulty, card.stability, r)
        newCard = {
          ...card,
          state: 'relearning',
          stability: Math.max(0.1, s),
          difficulty: d,
          reps: card.reps + 1,
          lapses: card.lapses + 1,
          elapsedDays,
          scheduledDays: 0,
          lastReview: nowISO,
          due: minutesLater(now, RELEARNING_STEPS_MINUTES[0]),
        }
      } else {
        const s = nextRecallStability(card.difficulty, card.stability, r, rating)
        const interval = nextInterval(s)
        newCard = {
          ...card,
          state: 'review',
          stability: Math.max(0.1, s),
          difficulty: d,
          reps: card.reps + 1,
          elapsedDays,
          scheduledDays: interval,
          lastReview: nowISO,
          due: daysLater(now, interval),
        }
      }
      break
    }
  }

  return {
    card: newCard,
    scheduledDays: newCard.scheduledDays,
    rating,
  }
}

/**
 * Return true if the card is due for review on or before `now`.
 */
export function isFSRSCardDue(card: FSRSCard, now: Date = new Date()): boolean {
  if (!card.due) return true
  return new Date(card.due) <= now
}

/**
 * Preview the scheduled intervals for all 4 ratings without mutating state.
 * Useful for displaying "Again: 1d  Hard: 3d  Good: 8d  Easy: 21d" in study UI.
 */
export function fsrsPreviewIntervals(
  card: FSRSCard,
  now: Date = new Date(),
): Record<FSRSRating, number> {
  return {
    1: fsrsSchedule(card, 1, now).scheduledDays,
    2: fsrsSchedule(card, 2, now).scheduledDays,
    3: fsrsSchedule(card, 3, now).scheduledDays,
    4: fsrsSchedule(card, 4, now).scheduledDays,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minutesLater(from: Date, minutes: number): string {
  return new Date(from.getTime() + minutes * 60_000).toISOString()
}

function daysLater(from: Date, days: number): string {
  // Snap to start-of-day so due dates display as "Jun 7" not "Jun 6 23:59"
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}
