import { beforeEach, describe, expect, it } from 'vitest'
import { loadDeckStudyMode, saveDeckStudyMode } from './flashcardStudyMode'

describe('deck study mode preference', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to flip and keeps separate selections by Library and deck', () => {
    expect(loadDeckStudyMode('library', 'deck-a')).toBe('flip')
    saveDeckStudyMode('library', 'deck-a', 'typed')
    saveDeckStudyMode('library', 'deck-b', 'choice')
    expect(loadDeckStudyMode('library', 'deck-a')).toBe('typed')
    expect(loadDeckStudyMode('library', 'deck-b')).toBe('choice')
    expect(loadDeckStudyMode('other-library', 'deck-a')).toBe('flip')
  })
})
