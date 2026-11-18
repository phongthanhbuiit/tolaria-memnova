import { createChoiceQuestion, type ChoiceQuestion } from './flashcardQuestions'
import { plainCardAnswer } from './flashcardAnswers'
import type { LearningCard, LearningPage, LearningProperty } from './types'

export const CHALLENGE_QUESTIONS = 10
export const QUESTION_DURATION = 20_000

export interface ChallengeQuestion extends ChoiceQuestion {
  ownerPath?: string
  image?: LearningProperty
  audio?: LearningProperty
}

export function challengeQuestions(
  cards: readonly LearningCard[],
  pages: readonly Pick<LearningPage, 'id' | 'path'>[] = [],
): ChallengeQuestion[] {
  const pagePaths = new Map(pages.map(page => [page.id, page.path]))
  const eligible = cards.filter(card => card.status === 'active' && card.front.trim() && plainCardAnswer(card))
  const rounds = Array.from({ length: CHALLENGE_QUESTIONS }, (_, round) => {
    const card = eligible[round % eligible.length]
    if (!card) return null
    const question = createChoiceQuestion(card, cards, round)
    return question && {
      ...question,
      ownerPath: pagePaths.get(card.pageId),
      image: card.properties?.image,
      audio: card.properties?.audio,
    }
  })
  return rounds.every(question => question !== null) ? rounds : []
}

export interface ChallengeRound {
  index: number
  deadline: number
  remaining: number
  status: 'running' | 'paused' | 'feedback' | 'done'
  selected: number | null
  correct: number
  streak: number
  bestStreak: number
}

type ChallengeAction =
  | { kind: 'tick' | 'pause' | 'resume' | 'next'; now: number }
  | { kind: 'answer'; now: number; index: number; correct: boolean }

export function startChallenge(now: number): ChallengeRound {
  return { index: 0, deadline: now + QUESTION_DURATION, remaining: QUESTION_DURATION, status: 'running', selected: null, correct: 0, streak: 0, bestStreak: 0 }
}

export function challengeRound(round: ChallengeRound, action: ChallengeAction): ChallengeRound {
  if (round.status === 'running') {
    const remaining = Math.max(0, round.deadline - action.now)
    if (remaining === 0) return { ...round, status: 'feedback', remaining, streak: 0 }
    if (action.kind === 'tick') return { ...round, remaining }
    if (action.kind === 'pause') return { ...round, status: 'paused', remaining }
    if (action.kind === 'answer') {
      const streak = action.correct ? round.streak + 1 : 0
      return {
        ...round, remaining, status: 'feedback', selected: action.index,
        correct: round.correct + Number(action.correct), streak, bestStreak: Math.max(streak, round.bestStreak),
      }
    }
  }
  if (round.status === 'paused' && action.kind === 'resume') {
    return { ...round, deadline: action.now + round.remaining, status: 'running' }
  }
  if (round.status === 'feedback' && action.kind === 'next') {
    if (round.index + 1 === CHALLENGE_QUESTIONS) return { ...round, status: 'done' }
    return {
      ...round, index: round.index + 1, deadline: action.now + QUESTION_DURATION,
      remaining: QUESTION_DURATION, status: 'running', selected: null,
    }
  }
  return round
}
