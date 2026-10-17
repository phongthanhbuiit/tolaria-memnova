import { expect, it } from 'vitest'
import { cardPresetFields, cardPresetKeys } from './cardPropertyPreset'
it('keeps unsupported or explicitly differently typed metadata visible in custom fields', () => {
  const props = {
    card_type: 'vocabulary',
    IPA: { raw: true },
    audio: null,
    level: 0,
    synonyms: ['[[A]]', '[[B]]'],
  }
  const fields = cardPresetFields(props, { level: { valueKind: 'number' } })
  expect(fields).not.toContain('IPA')
  expect(fields).not.toContain('audio')
  expect(fields).not.toContain('level')
  expect(fields).toContain('synonyms')
  expect(cardPresetFields({ ...props, card_type: 'basic' }, {})).not.toContain(
    'synonyms',
  )
  expect(cardPresetKeys).toContain('synonyms')
})
