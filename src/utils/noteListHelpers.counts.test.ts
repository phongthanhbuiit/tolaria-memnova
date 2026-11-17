import { describe, expect, it } from 'vitest'
import { formatSubtitle, formatSearchSubtitle } from './noteListHelpers'
import { makeEntry } from '../test-utils/noteListTestUtils'

describe('R-01 localized subtitle counts', () => {
  for (const format of [formatSubtitle, formatSearchSubtitle]) {
    it.each([
      ['en', [1, 2, 5, 21], ['1 word · 1 link', '2 words · 2 links', '5 words · 5 links', '21 words · 21 links'], '1,234 words', 'Empty'],
      ['vi', [1, 2, 5, 21], ['1 từ · 1 liên kết', '2 từ · 2 liên kết', '5 từ · 5 liên kết', '21 từ · 21 liên kết'], '1.234 từ', 'Trống'],
      ['ru-RU', [1, 2, 5, 21], ['1 слово · 1 ссылка', '2 слова · 2 ссылки', '5 слов · 5 ссылок', '21 слово · 21 ссылка'], '1\u00a0234 слова', 'Пусто'],
      ['pl-PL', [1, 2, 5, 21], ['1 słowo · 1 link', '2 słowa · 2 linki', '5 słów · 5 linków', '21 słów · 21 linków'], '1234 słowa', 'Pusto'],
    ] as const)('%s uses grammatical plurals and localized grouping', (locale, counts, expected, grouped, empty) => {
      for (const [i, count] of counts.entries()) {
        const entry = makeEntry({ createdAt: null, modifiedAt: null, wordCount: count, outgoingLinks: Array.from({ length: count }, (_, i) => String(i)) })
        const original = JSON.stringify(entry)
        expect(format(entry, 'friendly', locale)).toBe(expected[i])
        expect(JSON.stringify(entry)).toBe(original)
      }
      expect(format(makeEntry({ createdAt: null, modifiedAt: null, wordCount: 1234, outgoingLinks: [] }), 'friendly', locale)).toBe(grouped)
      expect(format(makeEntry({ createdAt: null, modifiedAt: null, wordCount: 0, outgoingLinks: [] }), 'friendly', locale)).toBe(empty)
    })
  }
})
