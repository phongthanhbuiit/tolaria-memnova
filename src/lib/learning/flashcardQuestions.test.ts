import { expect, it } from 'vitest'
import { createChoiceQuestion, hasChoicePool } from './flashcardQuestions'
import type { LearningCard } from './types'

const cards = ['Lima', 'Hà Nội', 'Oslo', 'Riga'].map((back, index) => ({
  id: String(index), front: `Question ${index}`, back, answerMode: 'inline', status: 'active',
} as LearningCard))

it('chooses distinct distractors from the same deck and keeps one correct choice', () => {
  const question = createChoiceQuestion(cards[0], cards)
  expect(question?.choices.map(choice => choice.label).sort()).toEqual(['Hà Nội', 'Lima', 'Oslo', 'Riga'])
  expect(question?.choices.filter(choice => choice.correct)).toEqual([{ label: 'Lima', correct: true }])
  expect(createChoiceQuestion(cards[0], cards)).toEqual(question)
})

it('requires four active short answers and does not duplicate equivalent distractors', () => {
  expect(hasChoicePool(cards)).toBe(true)
  expect(hasChoicePool(cards.slice(0, 3))).toBe(false)
  expect(hasChoicePool([...cards.slice(0, 3), { ...cards[3], back: '  LIMA  ' }])).toBe(false)
  expect(createChoiceQuestion(cards[0], [...cards.slice(0, 3), { ...cards[3], back: '![Map](map.png)' }])).toBeNull()
})
