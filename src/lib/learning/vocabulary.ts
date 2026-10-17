import type { LearningProperty } from './types'
export const vocabularyRelations = [
  ['synonyms', 'learning.synonyms'], ['antonyms', 'learning.antonyms'],
  ['prefixes', 'learning.prefixes'], ['suffixes', 'learning.suffixes'],
] as const
export const vocabularyContext = [['part_of_speech', 'learning.partOfSpeech'], ['level', 'learning.level']] as const
export function vocabularyText(properties: Record<string, LearningProperty>, key: string): string {
  const value = properties[key]
  return Array.isArray(value) && value.every(item => typeof item === 'string') ? value.join(', ') : typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}
export function parseVocabularyLinks(value: string): string[] {
  return (value.match(/\[\[(.*?)\]\]/g) ?? []).map(raw => raw.slice(2, -2).split('|')[0].trim()).filter(Boolean)
}
export function stringifyVocabularyLinks(targets: string[]): string { return targets.map(target => `[[${target}]]`).join(', ') }
export function addVocabularyLink(value: string, target: string): string {
  return parseVocabularyLinks(value).includes(target) ? value : [value, `[[${target}]]`].filter(Boolean).join(', ')
}
export function removeVocabularyLink(value: string, target: string): string {
  return value.replace(/\[\[(.*?)\]\]/g, (raw: string, inner: string) => inner.split('|')[0].trim() === target ? '' : raw)
    .replace(/,\s*,/g, ',').replace(/^\s*,\s*|\s*,\s*$/g, '').trim()
}

export function vocabularyEditable(value: LearningProperty | undefined): boolean {
  return value == null || typeof value === 'string' || typeof value === 'number' || (Array.isArray(value) && value.every(item => typeof item === 'string'))
}
export function addVocabularyRelation(value: LearningProperty | undefined, target: string): LearningProperty {
  if (!vocabularyEditable(value)) throw new Error('Unsupported relation value was preserved')
  if (Array.isArray(value)) return value.some(item => parseVocabularyLinks(String(item)).includes(target)) ? value : [...value, `[[${target}]]`]
  return addVocabularyLink(value == null ? '' : String(value), target)
}
export function removeVocabularyRelation(value: LearningProperty | undefined, target: string): LearningProperty {
  if (!vocabularyEditable(value)) throw new Error('Unsupported relation value was preserved')
  if (Array.isArray(value)) return value.map(item => removeVocabularyLink(String(item), target)).filter(Boolean)
  return removeVocabularyLink(value == null ? '' : String(value), target)
}
