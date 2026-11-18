import type { LearningCard } from './types'

export const FLASHCARD_STUDY_MODES = ['flip', 'typed', 'choice', 'challenge'] as const
export type FlashcardStudyMode = typeof FLASHCARD_STUDY_MODES[number]
export type ReviewStudyMode = Exclude<FlashcardStudyMode, 'challenge'>
export interface ReviewPresentation { mode: ReviewStudyMode; cards?: readonly LearningCard[] }

function deckModeKey(library: string, deck: string): string {
  return `memnova:study-mode:${JSON.stringify([library, deck])}`
}

export function loadDeckStudyMode(library: string, deck: string): FlashcardStudyMode {
  try {
    const value = localStorage.getItem(deckModeKey(library, deck))
    return FLASHCARD_STUDY_MODES.find(mode => mode === value) ?? 'flip'
  } catch { return 'flip' }
}

export function saveDeckStudyMode(library: string, deck: string, mode: FlashcardStudyMode): void {
  try { localStorage.setItem(deckModeKey(library, deck), mode) } catch { /* Use the current choice when storage is unavailable. */ }
}
