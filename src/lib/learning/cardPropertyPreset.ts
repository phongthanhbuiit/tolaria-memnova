import {
  vocabularyContext,
  vocabularyRelations,
  vocabularyEditable,
} from './vocabulary'
import type { LearningProperty } from './types'
import type { PropertyDefinitions } from './propertyValues'
export const cardPresetKeys = [
  'card_type',
  'IPA',
  'audio',
  'image',
  ...vocabularyContext.map(([key]) => key),
  ...vocabularyRelations.map(([key]) => key),
]
export function cardPresetFields(
  properties: Record<string, LearningProperty>,
  definitions: PropertyDefinitions,
): string[] {
  return cardPresetKeys.filter((key) => {
    const value = properties[key]
    const hint = Object.hasOwn(definitions, key) ? definitions[key] : null
    if (key === 'card_type')
      return value === undefined || value === 'basic' || value === 'vocabulary'
    if (key === 'IPA' || key === 'audio' || key === 'image')
      return (
        (value === undefined || typeof value === 'string') &&
        (!hint || hint.valueKind === 'text')
      )
    if (properties.card_type !== 'vocabulary' || value === null) return false
    if (value === undefined) return true
    const relation = vocabularyRelations.some(([name]) => name === key)
    if (
      hint &&
      hint.valueKind !== 'text' &&
      !(relation && hint.valueKind === 'list' && hint.itemKind === 'text')
    )
      return false
    return vocabularyEditable(value)
  })
}
