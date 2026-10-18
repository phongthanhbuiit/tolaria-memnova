import { describe, expect, it } from 'vitest'
import corpus from '../../../tests/fixtures/note-memory/document-corpus.json'
import patches from '../../../tests/fixtures/note-memory/patch-corpus.json'
import type { MemoryFace, NoteMemoryConfig } from './noteMemoryConfig'
import { parseNoteMemoryDocument } from './noteMemoryDocument'
import { patchNoteMemoryConfig, patchNoteMemoryFace } from './noteMemoryPatch'
import { propertyKey } from './propertyValues'

describe('note-memory document golden corpus', () => {
  for (const sample of corpus) {
    it(sample.name, () => {
      const actual = parseNoteMemoryDocument(sample.source)
      expect({
        front: actual.front,
        back: actual.back,
        config: actual.config,
        pageId: actual.pageId,
        issues: actual.issues,
        ranges: actual.ranges,
      }).toEqual(sample.expected)
    })
  }
})

describe('shared patch corpus', () => {
  for (const sample of patches) {
    it(sample.name, () => {
      const actual = sample.config
        ? patchNoteMemoryConfig(sample.source, sample.config as NoteMemoryConfig)
        : patchNoteMemoryFace(sample.source, sample.face as MemoryFace, sample.content ?? '', sample.createBack)
      expect(actual).toBe(sample.expected)
    })
  }
})

describe('patching one face never rewrites the other', () => {
  const source = corpus.find(sample => sample.name === 'CRLF BOM and Unicode')!.source
  it('keeps the complete source byte-for-byte on a no-op', () => {
    const parsed = parseNoteMemoryDocument(source)
    expect(patchNoteMemoryFace(source, 'front', parsed.front)).toBe(source)
    expect(patchNoteMemoryFace(source, 'back', parsed.back)).toBe(source)
  })
  it('preserves metadata and back indentation when the front changes', () => {
    const before = parseNoteMemoryDocument(source)
    const next = patchNoteMemoryFace(source, 'front', '# Edited')
    expect(parseNoteMemoryDocument(next).back).toBe(before.back)
    expect(next.slice(0, next.indexOf('# Edited'))).toBe(source.slice(0, source.indexOf('# Tế')))
    expect(next).toContain('# Edited\r\n<!-- FLASHCARD:BACK -->  \r\n')
  })
  it('preserves the full prefix when only back changes', () => {
    const next = patchNoteMemoryFace(source, 'back', '    New diagram\r\n')
    expect(next.slice(0, next.indexOf('    New diagram'))).toBe(source.slice(0, source.indexOf('\r\n    Hình')))
  })
  it('adds a boundary only for an explicit back action', () => {
    expect(patchNoteMemoryFace('# Normal', 'back', '')).toBe('# Normal')
    expect(patchNoteMemoryFace('# Normal', 'back', '', true)).toBe('# Normal\n\n<!-- FLASHCARD:BACK -->\n')
  })
  it('rejects ambiguous source instead of deleting a second back', () => {
    const ambiguous = corpus.find(sample => sample.name === 'multiple markers fail closed')!.source
    expect(() => patchNoteMemoryFace(ambiguous, 'back', 'New')).toThrow()
  })
  it('refuses a front edit that would swallow the back delimiter into a code fence', () => {
    expect(() => patchNoteMemoryFace(source, 'front', '```html\nUnclosed')).toThrow()
  })
  it('rejects an ambiguous new back instead of creating two delimiters', () => {
    expect(() => patchNoteMemoryFace('# Article', 'back', 'One\n<!-- FLASHCARD:BACK -->\nTwo')).toThrow()
  })
  it('does not let front editing implicitly create a back', () => {
    expect(() => patchNoteMemoryFace('# Article', 'front', '# Changed\n<!-- FLASHCARD:BACK -->\nBack')).toThrow()
  })
})

describe('owned configuration patches', () => {
  const plain = '\ufeff---\r\n# Keep comment\r\ncontext: {keep: [false, 9007199254740993]}\r\n_fsrs_enabled: true\r\n---\r\n# Article\r\n'
  const inline = { version: 1, enabled: true, back: { kind: 'inline' } } as const
  it('preserves opaque frontmatter and the legacy flag', () => {
    const next = patchNoteMemoryConfig(plain, inline)
    expect(next).toContain(plain.slice(0, plain.lastIndexOf('---')))
    expect(next.endsWith('---\r\n# Article\r\n')).toBe(true)
    expect(parseNoteMemoryDocument(next).config).toEqual(inline)
    expect(patchNoteMemoryConfig(next, inline)).toBe(next)
  })
  it('disabling learning keeps both faces', () => {
    const original = corpus.find(sample => sample.name === 'inline note memory')!.source
    const changed = patchNoteMemoryConfig(original, { ...inline, enabled: false })
    expect(parseNoteMemoryDocument(changed).back).toBe(parseNoteMemoryDocument(original).back)
    expect(changed).toContain('_memnova_learning_enabled: false')
  })
  it('does not rewrite owned comments for a semantically identical configuration', () => {
    const original = corpus.find(sample => sample.name === 'inline note memory')!.source.replace('enabled: true', 'enabled: true # keep this comment')
    expect(patchNoteMemoryConfig(original, { enabled: true, back: { kind: 'inline' }, version: 1 })).toBe(original)
  })
  it('changes only the owned value that actually changed', () => {
    const original = corpus.find(sample => sample.name === 'inline note memory')!.source.replace('kind: inline', 'kind: "inline" # keep kind style')
    const changed = patchNoteMemoryConfig(original, { ...inline, enabled: false })
    expect(changed).toBe(original.replace('enabled: true', 'enabled: false'))
  })
  it('switching back to inline removes only owned link fields', () => {
    const original = corpus.find(sample => sample.name === 'linked front keeps local back')!.source
    const changed = patchNoteMemoryConfig(original, inline)
    expect(changed).not.toContain('_memnova_back_page_id:')
    expect(changed).not.toContain('_memnova_back_face:')
    expect(parseNoteMemoryDocument(changed).back).toBe('Retained inline back\n')
  })
  it('refuses to overwrite future format or malformed owned keys', () => {
    for (const name of ['future version', 'duplicate owned key', 'nested owned field cannot be promoted']) {
      expect(() => patchNoteMemoryConfig(corpus.find(sample => sample.name === name)!.source, inline)).toThrow()
    }
  })
  it('does not expose owned fields as freely editable properties', () => {
    for (const name of ['_memnova_learning_version', '_memnova_learning_enabled', '_memnova_back_kind', '_memnova_back_page_id', '_memnova_back_face']) {
      expect(() => propertyKey(name)).toThrow()
    }
  })
})
