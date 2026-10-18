import { expect, it } from 'vitest'
import { pagePropertyKey, pagePropertySnapshot } from './pagePropertySnapshot'
import { parseFrontmatter } from '../../utils/frontmatter'
it('protects nested and mixed YAML and never promotes nested keys to editable page properties', () => {
  const raw =
    '---\ntype: Note\n_memnova_page_id: id\nplain: 0\nnested:\n  child: true\nmixed:\n  - one\n  - 2\ntext: "false"\nitems: ["a,b", "c"]\n---\nBody'
  const values = pagePropertySnapshot(parseFrontmatter(raw), raw)
  expect(values).not.toHaveProperty('child')
  expect(values).not.toHaveProperty('type')
  expect(values).not.toHaveProperty('_memnova_page_id')
  expect(values.plain).toBe(0)
  expect(values.text).toBe('false')
  expect(values.items).toEqual(['a,b', 'c'])
  expect(values.nested).toEqual({ raw: 'nested:\n  child: true' })
  expect(values.mixed).toEqual({ raw: 'mixed:\n  - one\n  - 2' })
})
it('rejects page aliases that would overwrite a dedicated or existing property', () => {
  for (const key of ['Type', 'WORKSPACE', '_fsrs', 'status'])
    expect(() => pagePropertyKey(key, { Status: 'Active' })).toThrow()
  expect(() =>
    pagePropertyKey('Status', { Status: 'Active' }, 'Status'),
  ).not.toThrow()
})
it('preserves strings with JSON escapes and quoted keys instead of exposing a projected value', () => {
  const raw = '---\n"topic:key": "a\\nb"\n---\nBody'
  expect(pagePropertySnapshot(parseFrontmatter(raw), raw)['topic:key']).toBe(
    'a\nb',
  )
})

it('rejects a case-only rename that the existing Markdown writer treats as the same key', () => {
  expect(() =>
    pagePropertyKey('status', { Status: 'Active' }, 'Status'),
  ).toThrow()
})

it('reads editable properties and protects opaque YAML in a BOM/CRLF note', () => {
  const raw = '\ufeff---\r\nStatus: Draft\r\ncount: 0\r\nopaque: &value {huge: 9007199254740993, empty: null}\r\ncopy: *value\r\n---\r\nArticle\r\n<!-- FLASHCARD:BACK -->\r\nMnemonic\r\n'
  const snapshot = pagePropertySnapshot(parseFrontmatter(raw), raw)
  expect(snapshot.Status).toBe('Draft')
  expect(snapshot.count).toBe(0)
  expect(snapshot.opaque).toEqual({ raw: 'opaque: &value {huge: 9007199254740993, empty: null}' })
  expect(snapshot.copy).toEqual({ raw: 'copy: *value' })
})
