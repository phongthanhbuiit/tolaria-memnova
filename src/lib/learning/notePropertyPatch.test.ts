import { expect, it } from 'vitest'
import { patchNoteProperty } from './notePropertyPatch'

const raw =
  '\ufeff---\r\n# untouched\r\n_memnova_page_id: 11111111-1111-4111-8111-111111111111\r\nStatus: Draft\r\nopaque: &value {huge: 9007199254740993, empty: null}\r\ncopy: *value\r\n---\r\nArticle\r\n<!-- FLASHCARD:BACK -->\r\n```whiteboard\r\n{"id":"board","snapshot":{}}\r\n```\r\n'
it('patches only the selected scalar, preserving every other byte and both faces', () => {
  expect(patchNoteProperty(raw, 'Status', 'Done')).toBe(
    raw.replace('Status: Draft', 'Status: "Done"')
  )
  const added = patchNoteProperty(raw, 'topic:key', 'a: b # c\n"quoted"')
  expect(added).toBe(
    raw.replace(
      '\r\n---\r\nArticle',
      '\r\n"topic:key": "a: b # c\\n\\"quoted\\""\r\n---\r\nArticle'
    )
  )
})
it('keeps falsy values distinct and removes only the requested field', () => {
  for (const value of [0, false, null, '']) {
    expect(patchNoteProperty(raw, 'Status', value)).toContain(
      `Status: ${JSON.stringify(value)}\r\n`
    )
  }
  expect(patchNoteProperty(raw, 'Status', undefined)).toBe(
    raw.replace('Status: Draft\r\n', '')
  )
})
it('updates quoted keys and their value continuation without touching adjacent opaque YAML', () => {
  const source = raw.replace('Status: Draft', '"topics":\r\n  - "old"')
  expect(patchNoteProperty(source, 'topics', ['a"b', 'c\nd'])).toBe(
    raw.replace('Status: Draft', 'topics:\r\n  - "a\\"b"\r\n  - "c\\nd"')
  )
})
it.each([
  '_memnova_page_id',
  ' _MEMNOVA_back_kind ',
  '_fsrs_reps',
  'key\nnext',
])('rejects reserved or invalid key %s', (key) => {
  expect(() => patchNoteProperty(raw, key, 'unsafe')).toThrow()
})
it('uses the existing dedicated-property aliases and preserves a body containing literal markers', () => {
  const source =
    '---\nIs A: Note\n_width: normal\n---\nExample\n<!-- FLASHCARD:BACK -->\nReference'
  expect(patchNoteProperty(source, 'type', 'Article')).toBe(
    source.replace('Is A: Note', 'type: "Article"')
  )
  expect(patchNoteProperty(source, 'width', 'wide')).toBe(
    source.replace('_width: normal', '_width: "wide"')
  )
})
