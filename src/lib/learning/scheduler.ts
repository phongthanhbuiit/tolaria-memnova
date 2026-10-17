import { fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'
import type { FSRSRating } from '../fsrs'
import type { LearningSchedule } from './types'

export const SCHEDULER_ENGINE = 'ts-fsrs@5.4.2' as const
const scheduler = fsrs({
  request_retention: 0.9,
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m'],
})
const states = { new: State.New, learning: State.Learning, review: State.Review, relearning: State.Relearning }
const stateNames = { [State.New]: 'new', [State.Learning]: 'learning', [State.Review]: 'review', [State.Relearning]: 'relearning' } as const
const grades: Record<FSRSRating, Grade> = { 1: Rating.Again, 2: Rating.Hard, 3: Rating.Good, 4: Rating.Easy }

function date(value: string): Date {
  const result = new Date(value)
  if (!Number.isFinite(result.getTime())) throw new Error('Invalid learning date')
  return result
}

function engineCard(card: LearningSchedule, now: Date): Card {
  const counts = [card.reps, card.lapses, card.learningSteps, card.revision]
  const numbers = [card.stability, card.difficulty, card.elapsedDays, card.scheduledDays]
  if (!Number.isFinite(now.getTime()) || numbers.some(value => !Number.isFinite(value) || value < 0)
    || counts.some(value => !Number.isInteger(value) || value < 0 || value >= 0xffff_ffff)
    || card.difficulty > 10 || !(card.state in states)
    || !['legacy-fsrs5', SCHEDULER_ENGINE].includes(card.engine)) {
    throw new Error('Invalid learning schedule')
  }
  const lastReview = card.lastReview === null ? undefined : date(card.lastReview)
  if (lastReview && lastReview > now) throw new Error('Review clock predates the previous review')
  return {
    due: date(card.due), state: states[card.state],
    stability: card.stability, difficulty: card.difficulty,
    elapsed_days: card.elapsedDays, scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps, reps: card.reps, lapses: card.lapses,
    last_review: lastReview,
  }
}

/** The engine changes only when a rating is applied; reading/importing never reschedules. */
export function scheduleReview(card: LearningSchedule, rating: FSRSRating, now: Date): LearningSchedule {
  if (!grades[rating]) throw new Error('Invalid review rating')
  const result = scheduler.next(engineCard(card, now), now, grades[rating]).card
  return {
    state: stateNames[result.state], stability: result.stability, difficulty: result.difficulty,
    elapsedDays: result.elapsed_days, scheduledDays: result.scheduled_days,
    learningSteps: result.learning_steps, reps: result.reps, lapses: result.lapses,
    lastReview: result.last_review?.toISOString() ?? null, due: result.due.toISOString(),
    engine: SCHEDULER_ENGINE, revision: card.revision + 1,
  }
}

export function previewSchedule(card: LearningSchedule, now: Date): Record<FSRSRating, LearningSchedule> {
  return { 1: scheduleReview(card, 1, now), 2: scheduleReview(card, 2, now), 3: scheduleReview(card, 3, now), 4: scheduleReview(card, 4, now) }
}
