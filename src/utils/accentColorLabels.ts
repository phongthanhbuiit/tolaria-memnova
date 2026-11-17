import { translate, type AppLocale, type TranslationKey } from '../lib/i18n'

const LABELS: Readonly<Record<string, TranslationKey>> = {
  red: 'a11y.color.red', orange: 'a11y.color.orange', yellow: 'a11y.color.yellow',
  green: 'a11y.color.green', blue: 'a11y.color.blue', purple: 'a11y.color.purple',
  teal: 'a11y.color.teal', pink: 'a11y.color.pink', gray: 'a11y.color.gray',
}

export function accentColorLabel(key: string, locale: AppLocale): string {
  return Object.hasOwn(LABELS, key) ? translate(locale, LABELS[key]) : key
}
