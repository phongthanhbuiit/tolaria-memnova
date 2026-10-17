import { expect, it } from 'vitest'
import { addVocabularyLink, parseVocabularyLinks, removeVocabularyLink } from './vocabulary'
it('preserves imported aliases and comma-containing titles when adding or removing another relation', () => {
  const original = '[[Old, target|alias]], [[Opposite]]'
  expect(parseVocabularyLinks(original)).toEqual(['Old, target', 'Opposite'])
  expect(addVocabularyLink(original, 'Old, target')).toBe(original)
  expect(addVocabularyLink(original, 'New')).toBe(`${original}, [[New]]`)
  expect(removeVocabularyLink(original, 'Opposite')).toBe('[[Old, target|alias]]')
  expect(removeVocabularyLink(original, 'Old, target')).toBe('[[Opposite]]')
})
