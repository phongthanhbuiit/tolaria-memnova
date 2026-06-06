import { describe, it, expect } from 'vitest'
import {
  splitFlashcardContent,
  joinFlashcardContent,
  appendFlashcardBackMarker,
  removeFlashcardBack,
  extractFlashcardFrontTitle,
  FLASHCARD_BACK_MARKER,
} from './flashcardMarkdown'

const MARKER = FLASHCARD_BACK_MARKER

// ---------------------------------------------------------------------------
// splitFlashcardContent
// ---------------------------------------------------------------------------

describe('splitFlashcardContent', () => {
  it('returns full content as front when no marker present', () => {
    const md = '# My Note\n\nSome content here.'
    const result = splitFlashcardContent(md)
    expect(result.front).toBe(md)
    expect(result.back).toBe('')
    expect(result.hasBack).toBe(false)
  })

  it('splits correctly when marker is present', () => {
    const md = `# Question\n\nWhat is F=ma?\n\n${MARKER}\n\nNewton's second law.`
    const result = splitFlashcardContent(md)
    expect(result.hasBack).toBe(true)
    expect(result.front).toContain('# Question')
    expect(result.front).toContain('What is F=ma?')
    expect(result.front).not.toContain(MARKER)
    expect(result.back).toContain("Newton's second law")
    expect(result.back).not.toContain(MARKER)
  })

  it('back is empty string when marker is at end with no back content', () => {
    const md = `# Question\n\n${MARKER}\n`
    const result = splitFlashcardContent(md)
    expect(result.hasBack).toBe(true)
    expect(result.back).toBe('')
  })

  it('preserves frontmatter in front section', () => {
    const md = `---\ntype: Biology\n_fsrs_enabled: true\n---\n\n# Cell\n\n${MARKER}\n\nAnswer here.`
    const result = splitFlashcardContent(md)
    expect(result.front).toContain('---')
    expect(result.front).toContain('type: Biology')
    expect(result.back).toBe('Answer here.')
  })
})

// ---------------------------------------------------------------------------
// joinFlashcardContent
// ---------------------------------------------------------------------------

describe('joinFlashcardContent', () => {
  it('joins front and back with marker', () => {
    const result = joinFlashcardContent('# Front', 'Back content')
    expect(result).toContain(MARKER)
    expect(result.indexOf('# Front')).toBeLessThan(result.indexOf(MARKER))
    expect(result.indexOf('Back content')).toBeGreaterThan(result.indexOf(MARKER))
  })

  it('returns only front when back is empty', () => {
    const result = joinFlashcardContent('# Front', '')
    expect(result).not.toContain(MARKER)
    expect(result).toBe('# Front')
  })

  it('round-trips through split → join', () => {
    const original = `---\ntype: Biology\n---\n\n# Cell membrane\n\nDescription.\n\n${MARKER}\n\nAnswer with **canvas**.`
    const { front, back } = splitFlashcardContent(original)
    const rejoined = joinFlashcardContent(front, back)
    // Should reproduce the marker-separated structure
    expect(splitFlashcardContent(rejoined).front).toBe(splitFlashcardContent(original).front)
    expect(splitFlashcardContent(rejoined).back).toBe(splitFlashcardContent(original).back)
  })
})

// ---------------------------------------------------------------------------
// appendFlashcardBackMarker
// ---------------------------------------------------------------------------

describe('appendFlashcardBackMarker', () => {
  it('appends marker when not present', () => {
    const md = '# My note\n\nContent here.'
    const result = appendFlashcardBackMarker(md)
    expect(result).toContain(MARKER)
    expect(result.indexOf('# My note')).toBeLessThan(result.indexOf(MARKER))
  })

  it('does not duplicate marker when already present', () => {
    const md = `# Note\n\n${MARKER}\n\nBack.`
    const result = appendFlashcardBackMarker(md)
    const count = (result.match(/FLASHCARD:BACK/g) ?? []).length
    expect(count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// removeFlashcardBack
// ---------------------------------------------------------------------------

describe('removeFlashcardBack', () => {
  it('returns unchanged content when no marker', () => {
    const md = '# Note\n\nContent.'
    expect(removeFlashcardBack(md)).toBe(md)
  })

  it('removes marker and back content', () => {
    const md = `# Note\n\nFront.\n\n${MARKER}\n\nBack content.`
    const result = removeFlashcardBack(md)
    expect(result).not.toContain(MARKER)
    expect(result).not.toContain('Back content')
    expect(result).toContain('Front.')
  })
})

// ---------------------------------------------------------------------------
// extractFlashcardFrontTitle
// ---------------------------------------------------------------------------

describe('extractFlashcardFrontTitle', () => {
  it('extracts H1 heading', () => {
    expect(extractFlashcardFrontTitle('# Newton\'s Laws\n\nContent')).toBe("Newton's Laws")
  })

  it('extracts frontmatter title', () => {
    const md = '---\ntitle: "Cell Biology"\n---\n\nContent.'
    expect(extractFlashcardFrontTitle(md)).toBe('Cell Biology')
  })

  it('returns empty string when no title found', () => {
    expect(extractFlashcardFrontTitle('Just some paragraph text.')).toBe('')
  })
})
