import { describe, expect, it } from 'vitest'
import { plainCardAnswer, scoreTypedAnswer } from './flashcardAnswers'

describe('typed flashcard answers', () => {
  it('ignores whitespace and case and keeps Vietnamese spelling distinctions', () => {
    expect(scoreTypedAnswer('  TIẾNG   Việt ', 'tiếng việt')).toBe('correct')
    expect(scoreTypedAnswer('dat nuoc', 'đất nước')).toBe('close')
    expect(scoreTypedAnswer('Vietnam', 'Việt Nam')).toBe('wrong')
    expect(scoreTypedAnswer('ano', 'año')).toBe('wrong')
  })

  it('leaves formatted Markdown answers to the flip renderer', () => {
    for (const back of ['**Hà Nội**', '1. Hà Nội', '[Hà Nội][capital]', '`Hà Nội`', '~~Hà Nội~~', 'H&agrave; N&#7897;i',
      'Hà Nội\n======', '| Thủ đô |\n| ------ |\n| Hà Nội |', '$x+1$']) {
      expect(plainCardAnswer({ answerMode: 'inline', back }), back).toBeNull()
    }
    expect(plainCardAnswer({ answerMode: 'inline', back: 'C++ (1998)' })).toBe('C++ (1998)')
  })

  it('falls back for long text, page answers, images and drawing blocks', () => {
    expect(plainCardAnswer({ answerMode: 'inline', back: ' Pháp ' })).toBe('Pháp')
    for (const back of ['a'.repeat(121), '![[map.png]]', '![map](map.png)', '~~~excalidraw\n{}\n~~~']) {
      expect(plainCardAnswer({ answerMode: 'inline', back })).toBeNull()
    }
    expect(plainCardAnswer({ answerMode: 'page', back: 'An external answer' })).toBeNull()
  })
})
