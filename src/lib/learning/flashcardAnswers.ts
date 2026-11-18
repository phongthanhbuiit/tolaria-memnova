import type { CardDraft } from './types'
import type { FSRSRating } from '../fsrs'

export type AnswerQuality = 'correct' | 'close' | 'wrong'

export const SUGGESTED_RATING: Record<AnswerQuality, FSRSRating> = { correct: 3, close: 2, wrong: 1 }

export function normalizeFlashcardAnswer(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase()
}

function stripVietnameseMarks(text: string): string {
  return text.normalize('NFD')
    .replace(/([aeiouy])[\u0300\u0301\u0302\u0303\u0306\u0309\u031b\u0323]+/gu, '$1')
    .replace(/đ/gu, 'd')
    .normalize('NFC')
}

export function scoreTypedAnswer(typed: string, expected: string): AnswerQuality {
  const submitted = normalizeFlashcardAnswer(typed)
  const answer = normalizeFlashcardAnswer(expected)
  if (submitted === answer) return 'correct'
  return stripVietnameseMarks(submitted) === stripVietnameseMarks(answer) ? 'close' : 'wrong'
}

export function plainCardAnswer(card: Pick<CardDraft, 'back' | 'answerMode'>): string | null {
  const text = card.back.trim()
  if (card.answerMode !== 'inline' || !text || [...text].length > 120) return null
  // Formatted answers stay in the existing Markdown renderer rather than being graded as source.
  const inlineMarkup = /[*_`[\]<>\\]|~~|&(?:#[\dx][\da-f]*|[a-z][\da-z]*);/iu
  const blockMarkup = /(?:^|\n)\s*(?:#{1,6}\s|[-+*]\s|\d{1,9}[.)]\s|~{3}|-{3,}\s*$)/mu
  const tableOrHeading = /^[ \t]*(?:\||:?-+:?[ \t]*\||=+[ \t]*$)/mu
  const math = /\$[^$\n]+\$|\$\$/u
  if ([inlineMarkup, blockMarkup, tableOrHeading, math].some(markup => markup.test(text))) return null
  return text.replace(/\s+/gu, ' ')
}
