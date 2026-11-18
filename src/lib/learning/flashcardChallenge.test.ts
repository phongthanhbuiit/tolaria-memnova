import { expect, it } from 'vitest'
import { CHALLENGE_QUESTIONS, QUESTION_DURATION, challengeQuestions, challengeRound, startChallenge } from './flashcardChallenge'
import type { LearningCard } from './types'

it('builds ten rounds from four short cards without mutating the deck', () => {
  const cards = ['Lima', 'Hà Nội', 'Oslo', 'Riga'].map((back, index) => ({
    id: String(index), front: `Question ${index}`, back, answerMode: 'inline', status: 'active',
  } as LearningCard))
  const original = JSON.stringify(cards)
  const questions = challengeQuestions(cards)
  expect(questions).toHaveLength(CHALLENGE_QUESTIONS)
  expect(questions.every(question => question.choices.length === 4)).toBe(true)
  expect(JSON.stringify(cards)).toBe(original)
})

it('pauses time, scores a correct answer once, and resets the streak on timeout', () => {
  let round = challengeRound(startChallenge(0), { kind: 'pause', now: 5000 })
  expect(round.remaining).toBe(15000)
  round = challengeRound(round, { kind: 'tick', now: 60000 })
  expect(round.status).toBe('paused')
  round = challengeRound(round, { kind: 'resume', now: 60000 })
  expect(round.deadline).toBe(75000)
  round = challengeRound(round, { kind: 'answer', now: 62000, index: 1, correct: true })
  expect(round).toMatchObject({ correct: 1, streak: 1, status: 'feedback' })
  expect(challengeRound(round, { kind: 'answer', now: 62000, index: 3, correct: true })).toBe(round)
  round = challengeRound(round, { kind: 'next', now: 63000 })
  expect(round.remaining).toBe(QUESTION_DURATION)
  round = challengeRound(round, { kind: 'tick', now: 83000 })
  expect(round).toMatchObject({ correct: 1, streak: 0, bestStreak: 1, status: 'feedback', selected: null })
})

it('retains the question owner and front media for a card in a nested note', () => {
  const cards = ['Lima', 'Hà Nội', 'Oslo', 'Riga'].map((back, index) => ({
    id: String(index), pageId: 'capitals', front: '![](./image.svg)', back, answerMode: 'inline', status: 'active',
    properties: { image: './question.svg', audio: './pronunciation.ogg' },
  } as LearningCard))
  expect(challengeQuestions(cards, [{ id: 'capitals', path: 'geography/capitals.md' }])[0]).toMatchObject({
    prompt: '![](./image.svg)',
    ownerPath: 'geography/capitals.md',
    image: './question.svg',
    audio: './pronunciation.ogg',
  })
})
