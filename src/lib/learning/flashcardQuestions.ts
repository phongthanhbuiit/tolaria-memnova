import { normalizeFlashcardAnswer, plainCardAnswer } from './flashcardAnswers'
import type { LearningCard } from './types'

export interface StudyChoice { label: string; correct: boolean }
export interface ChoiceQuestion { cardId: string; prompt: string; choices: readonly StudyChoice[] }

function hashText(text: string): number {
  let value = 2166136261
  for (const character of text) value = Math.imul(value ^ (character.codePointAt(0) ?? 0), 16777619)
  return value >>> 0
}

function answerOptions(cards: readonly LearningCard[]): Map<string, string> {
  const distinct = new Map<string, string>()
  for (const card of cards) {
    if (card.status !== 'active') continue
    const answer = plainCardAnswer(card)
    if (answer) distinct.set(normalizeFlashcardAnswer(answer), answer)
  }
  return distinct
}

export function hasChoicePool(cards: readonly LearningCard[]): boolean {
  return answerOptions(cards).size >= 4
}

export function createChoiceQuestion(
  card: LearningCard,
  cards: readonly LearningCard[],
  round = 0,
): ChoiceQuestion | null {
  const answer = plainCardAnswer(card)
  if (!answer) return null
  const others = answerOptions(cards.filter(candidate => candidate.id !== card.id))
  others.delete(normalizeFlashcardAnswer(answer))
  if (others.size < 3) return null

  const seed = `${card.id}:${round}:`
  const distractors = [...others.values()]
    .sort((left, right) => hashText(seed + left) - hashText(seed + right))
    .slice(0, 3)
    .map(label => ({ label, correct: false }))
  const slot = hashText(seed) % 4
  distractors.splice(slot, 0, { label: answer, correct: true })
  return { cardId: card.id, prompt: card.front, choices: distractors }
}
