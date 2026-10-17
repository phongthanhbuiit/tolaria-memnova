import { describe, expect, it } from 'vitest'
import { previewSchedule, scheduleReview } from './scheduler'
import type { LearningSchedule } from './types'

const now = new Date('2026-10-17T12:00:00.000Z')
const fresh = (): LearningSchedule => ({ state: 'new', stability: 0, difficulty: 0, reps: 0, lapses: 0, elapsedDays: 0, scheduledDays: 0, lastReview: null, due: now.toISOString(), learningSteps: 0, engine: 'legacy-fsrs5', revision: 0 })

describe('maintained learning scheduler', () => {
  it('keeps previews pure and identical to a committed choice', () => {
    const card = fresh()
    const original = structuredClone(card)
    const previews = previewSchedule(card, now)
    expect(card).toEqual(original)
    for (const rating of [1, 2, 3, 4] as const) {
      expect(scheduleReview(card, rating, now)).toEqual(previews[rating])
      expect(previews[rating].engine).toBe('ts-fsrs@5.4.2')
      expect(previews[rating].reps).toBe(1)
      expect(previews[rating].lastReview).toBe(now.toISOString())
    }
    expect(new Date(previews[1].due).getTime() - now.getTime()).toBe(60_000)
    expect(previews[1].state).toBe('learning')
    expect(new Date(previews[3].due).getTime() - now.getTime()).toBe(600_000)
    expect(previews[4].state).toBe('review')
  })

  it('persists learning steps so Good graduates after the next step', () => {
    const first = scheduleReview(fresh(), 3, now)
    expect(first.learningSteps).toBe(1)
    const second = scheduleReview(first, 3, new Date(first.due))
    expect(second.state).toBe('review')
    expect(second.reps).toBe(2)
    expect(new Date(second.due).getTime()).toBeGreaterThan(new Date(first.due).getTime())
  })

  it('upgrades legacy memory only when rated without resetting its counters', () => {
    const legacy = { ...fresh(), state: 'review' as const, stability: 19.25, difficulty: 4.75, reps: 41, lapses: 3, revision: 8, lastReview: '2026-10-10T12:00:00.000Z' }
    const original = structuredClone(legacy)
    const result = scheduleReview(legacy, 1, now)
    expect(legacy).toEqual(original)
    expect(result.state).toBe('relearning')
    expect(result.reps).toBe(42)
    expect(result.lapses).toBe(4)
    expect(result.revision).toBe(9)
    expect(result.stability).toBeGreaterThan(0)
  })

  it('rejects invalid dates, counters and unsupported engines instead of issuing a reset', () => {
    expect(() => scheduleReview({ ...fresh(), due: 'invalid' }, 3, now)).toThrow()
    expect(() => scheduleReview({ ...fresh(), difficulty: Number.NaN }, 3, now)).toThrow()
    expect(() => scheduleReview({ ...fresh(), reps: -1 }, 3, now)).toThrow()
    expect(() => scheduleReview(fresh(), 3, new Date('invalid'))).toThrow()
    expect(() => scheduleReview({ ...fresh(), lastReview: '2026-10-18T00:00:00Z' }, 3, now)).toThrow()
    expect(() => scheduleReview({ ...fresh(), engine: 'unknown' } as unknown as LearningSchedule, 3, now)).toThrow()
    expect(() => scheduleReview({ ...fresh(), revision: 0xffff_ffff }, 3, now)).toThrow()
    expect(() => scheduleReview(fresh(), 0 as 1, now)).toThrow()
  })
})
