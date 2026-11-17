import { translate, type AppLocale, type TranslationKey } from '../lib/i18n'

export function humanizePropertyKey(key: string): string {
  const normalized = key.replace(/^_+/, '')
  const spaced = normalized.replace(/[_-]/g, ' ')
  if (!spaced) return spaced
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const SYSTEM_LABELS: Readonly<Record<string, TranslationKey>> = {
  type: 'inspector.propertyLabel.type', status: 'inspector.propertyLabel.status',
  date: 'inspector.propertyLabel.date', url: 'inspector.propertyLabel.url',
  icon: 'inspector.propertyLabel.icon', 'belongs to': 'inspector.propertyLabel.belongsTo',
  'related to': 'inspector.propertyLabel.relatedTo', has: 'inspector.propertyLabel.has',
}

/** Translate only recognized system labels, never stored keys or user-defined names. */
export function propertyDisplayLabel(key: string, locale: AppLocale): string {
  const normalized = key.replaceAll('_', ' ').toLowerCase()
  const translationKey = Object.hasOwn(SYSTEM_LABELS, normalized) ? SYSTEM_LABELS[normalized] : undefined
  return translationKey ? translate(locale, translationKey) : humanizePropertyKey(key)
}
