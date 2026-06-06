import { describe, it, expect } from 'vitest'
import {
  createNewFSRSCard,
  fsrsSchedule,
  fsrsPreviewIntervals,
  forgettingCurve,
  isFSRSCardDue,
  type FSRSCard,
} from './fsrs'

const NOW = new Date('2026-06-06T08:00:00.000Z')

function dayCard(overrides: Partial<FSRSCard> = {}): FSRSCard {
  return {
    ...createNewFSRSCard(NOW.toISOString()),
    ...overrides,
  }
}

describe('createNewFSRSCard', () => {
  it('creates a new card with default values', () => {
    const card = createNewFSRSCard()
    expect(card.state).toBe('new')
    expect(card.stability).toBe(0)
    expect(card.difficulty).toBe(0)
    expect(card.reps).toBe(0)
    expect(card.lapses).toBe(0)
    expect(card.lastReview).toBeNull()
  })
})

describe('forgettingCurve', () => {
  it('returns 1 at elapsed=0', () => {
    expect(forgettingCurve(0, 10)).toBeCloseTo(1)
  })

  it('returns ~0.9 at stability=10 and elapsed=10', () => {
    // Definition: stability = days for R to reach 90%
    expect(forgettingCurve(10, 10)).toBeCloseTo(0.9, 1)
  })

  it('returns 0 for zero stability', () => {
    expect(forgettingCurve(5, 0)).toBe(0)
  })

  it('decays over time', () => {
    const r1 = forgettingCurve(1, 10)
    const r5 = forgettingCurve(5, 10)
    const r10 = forgettingCurve(10, 10)
    expect(r1).toBeGreaterThan(r5)
    expect(r5).toBeGreaterThan(r10)
  })
})

describe('fsrsSchedule — new card', () => {
  it('Again on new card → learning state, due in ~1 min', () => {
    const card = dayCard()
    const result = fsrsSchedule(card, 1, NOW)
    expect(result.card.state).toBe('learning')
    expect(result.card.reps).toBe(1)
    expect(result.scheduledDays).toBe(0)
    // Due should be just minutes away, not days
    const dueDiff = new Date(result.card.due).getTime() - NOW.getTime()
    expect(dueDiff).toBeGreaterThan(0)
    expect(dueDiff).toBeLessThan(5 * 60_000) // less than 5 minutes
  })

  it('Good on new card → review state with ≥1 day interval', () => {
    const card = dayCard()
    const result = fsrsSchedule(card, 3, NOW)
    expect(result.card.state).toBe('review')
    expect(result.scheduledDays).toBeGreaterThanOrEqual(1)
    expect(result.card.stability).toBeGreaterThan(0)
    expect(result.card.difficulty).toBeGreaterThan(0)
  })

  it('Easy on new card → review state with ≥4 day interval', () => {
    const card = dayCard()
    const result = fsrsSchedule(card, 4, NOW)
    expect(result.card.state).toBe('review')
    expect(result.scheduledDays).toBeGreaterThanOrEqual(4)
  })

  it('Easy interval > Good interval > Hard interval for new card', () => {
    const card = dayCard()
    const again = fsrsSchedule(card, 1, NOW)
    const hard = fsrsSchedule(card, 2, NOW)
    const good = fsrsSchedule(card, 3, NOW)
    const easy = fsrsSchedule(card, 4, NOW)

    expect(again.scheduledDays).toBeLessThanOrEqual(hard.scheduledDays)
    expect(hard.scheduledDays).toBeLessThanOrEqual(good.scheduledDays)
    expect(good.scheduledDays).toBeLessThanOrEqual(easy.scheduledDays)
  })
})

describe('fsrsSchedule — review card', () => {
  const reviewCard = dayCard({
    state: 'review',
    stability: 10,
    difficulty: 5,
    reps: 5,
    lapses: 0,
    lastReview: new Date(NOW.getTime() - 10 * 86_400_000).toISOString(), // reviewed 10d ago
    scheduledDays: 10,
  })

  it('Good rating increases stability', () => {
    const result = fsrsSchedule(reviewCard, 3, NOW)
    expect(result.card.state).toBe('review')
    expect(result.card.stability).toBeGreaterThan(reviewCard.stability)
    expect(result.scheduledDays).toBeGreaterThan(10)
  })

  it('Again rating → relearning state', () => {
    const result = fsrsSchedule(reviewCard, 1, NOW)
    expect(result.card.state).toBe('relearning')
    expect(result.card.lapses).toBe(1)
    expect(result.card.stability).toBeLessThan(reviewCard.stability)
    expect(result.scheduledDays).toBe(0)
  })

  it('Hard has shorter interval than Good', () => {
    const hard = fsrsSchedule(reviewCard, 2, NOW)
    const good = fsrsSchedule(reviewCard, 3, NOW)
    const easy = fsrsSchedule(reviewCard, 4, NOW)
    expect(hard.scheduledDays).toBeLessThan(good.scheduledDays)
    expect(good.scheduledDays).toBeLessThan(easy.scheduledDays)
  })

  it('difficulty increases on Again, decreases on Easy', () => {
    const afterAgain = fsrsSchedule(reviewCard, 1, NOW)
    const afterEasy = fsrsSchedule(reviewCard, 4, NOW)
    expect(afterAgain.card.difficulty).toBeGreaterThan(reviewCard.difficulty)
    expect(afterEasy.card.difficulty).toBeLessThan(reviewCard.difficulty)
  })
})

describe('fsrsSchedule — relearning card', () => {
  const relearningCard = dayCard({
    state: 'relearning',
    stability: 3,
    difficulty: 7,
    reps: 8,
    lapses: 2,
    lastReview: new Date(NOW.getTime() - 1 * 86_400_000).toISOString(),
    scheduledDays: 0,
  })

  it('Good on relearning → review state', () => {
    const result = fsrsSchedule(relearningCard, 3, NOW)
    expect(result.card.state).toBe('review')
    expect(result.scheduledDays).toBeGreaterThanOrEqual(1)
  })

  it('Again on relearning → stays in relearning', () => {
    const result = fsrsSchedule(relearningCard, 1, NOW)
    expect(result.card.state).toBe('relearning')
    expect(result.card.lapses).toBe(relearningCard.lapses + 1)
  })
})

describe('isFSRSCardDue', () => {
  it('new card is always due', () => {
    const card = dayCard()
    expect(isFSRSCardDue(card, NOW)).toBe(true)
  })

  it('card due in the past is due', () => {
    const card = dayCard({
      due: new Date(NOW.getTime() - 86_400_000).toISOString(),
    })
    expect(isFSRSCardDue(card, NOW)).toBe(true)
  })

  it('card due in the future is not due', () => {
    const card = dayCard({
      due: new Date(NOW.getTime() + 86_400_000).toISOString(),
    })
    expect(isFSRSCardDue(card, NOW)).toBe(false)
  })
})

describe('fsrsPreviewIntervals', () => {
  it('returns 4 intervals in ascending order for a new card', () => {
    const card = dayCard()
    const intervals = fsrsPreviewIntervals(card, NOW)
    expect(intervals[1]).toBeLessThanOrEqual(intervals[2])
    expect(intervals[2]).toBeLessThanOrEqual(intervals[3])
    expect(intervals[3]).toBeLessThanOrEqual(intervals[4])
  })

  it('returns a non-zero interval for Good on new card', () => {
    const card = dayCard()
    const intervals = fsrsPreviewIntervals(card, NOW)
    expect(intervals[3]).toBeGreaterThan(0)
  })
})
