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

it('represents imported string arrays without losing unknown values', async () => {
 const { vocabularyText, addVocabularyRelation, removeVocabularyRelation, vocabularyEditable }=await import('./vocabulary')
 const value=['[[Old, title|alias]]','plain value','[[Other]]']
 expect(vocabularyText({synonyms:value},'synonyms')).toContain('Old, title')
 expect(addVocabularyRelation(value,'New')).toEqual([...value,'[[New]]'])
 expect(removeVocabularyRelation(value,'Other')).toEqual(value.slice(0,2))
 expect(vocabularyEditable({nested:[1]})).toBe(false)
 expect(vocabularyText({synonyms:{nested:[1]}},'synonyms')).toBe('')
})
