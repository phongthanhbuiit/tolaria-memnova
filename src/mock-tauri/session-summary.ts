import type { LearningCard, RateRequest, StudySession } from '../lib/learning/types'

export function summarizeSession(cards: readonly LearningCard[], reviews: readonly { request: RateRequest }[]): NonNullable<StudySession['summary']> {
  const grades: [number, number, number, number] = [0, 0, 0, 0]
  const lastByCard = new Map(reviews.map(({ request }) => [request.cardId, request.rating]))
  let nextDueAt: number | null = null
  for (const [id, rating] of lastByCard) {
    grades[rating - 1]++
    const card = cards.find(item => item.id === id && item.status === 'active')
    if (!card) continue
    const dueAt = Date.parse(card.schedule.due)
    if (Number.isFinite(dueAt)) nextDueAt = nextDueAt === null ? dueAt : Math.min(nextDueAt, dueAt)
  }
  return { grades, nextDueAt }
}
