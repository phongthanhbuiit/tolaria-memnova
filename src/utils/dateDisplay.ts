import { parseDashDateParts, parseSlashDateParts, type DateParts } from './dateStringParts'
import { getLocaleDateLocale, type AppLocale } from '../lib/i18n'

export type DateDisplayFormat = 'us' | 'european' | 'friendly' | 'iso'

export const DEFAULT_DATE_DISPLAY_FORMAT: DateDisplayFormat = 'friendly'
export const DATE_DISPLAY_FORMATS: readonly DateDisplayFormat[] = ['us', 'european', 'friendly', 'iso']

const friendlyFormatters = new Map<AppLocale, Intl.DateTimeFormat>()

function friendlyFormatter(locale: AppLocale): Intl.DateTimeFormat {
  let formatter = friendlyFormatters.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(getLocaleDateLocale(locale), {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC', calendar: 'gregory',
    })
    friendlyFormatters.set(locale, formatter)
  }
  return formatter
}

function isDateDisplayFormat(value: string): value is DateDisplayFormat {
  return DATE_DISPLAY_FORMATS.includes(value as DateDisplayFormat)
}

export function normalizeDateDisplayFormat(value: unknown): DateDisplayFormat | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return isDateDisplayFormat(normalized) ? normalized : null
}

function twoDigit(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatDatePartsForDisplay(
  parts: DateParts,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
  locale: AppLocale,
): string {
  if (format === 'us') return `${parts.month}/${parts.day}/${parts.year}`
  if (format === 'european') return `${parts.day}/${parts.month}/${parts.year}`
  if (format === 'iso') return `${parts.year}-${twoDigit(parts.month)}-${twoDigit(parts.day)}`
  const date = new Date(0)
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day)
  return friendlyFormatter(locale).format(date)
}

function datePartsFromDate(date: Date): DateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }
}

export function formatDateForDisplay(
  date: Date,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
  locale: AppLocale,
): string {
  if (Number.isNaN(date.getTime())) return ''
  return formatDatePartsForDisplay(datePartsFromDate(date), format, locale)
}

export function formatTimestampForDateDisplay(
  timestampSeconds: number | null | undefined,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
  locale: AppLocale,
): string {
  if (!timestampSeconds) return ''
  return formatDateForDisplay(new Date(timestampSeconds * 1000), format, locale)
}

export function parseDateDisplayParts(value: string): DateParts | null {
  return parseDashDateParts(value) ?? parseSlashDateParts(value)
}

export function formatDateValueForDisplay(
  value: string,
  format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
  locale: AppLocale,
): string {
  const parts = parseDateDisplayParts(value)
  return parts ? formatDatePartsForDisplay(parts, format, locale) : value
}
