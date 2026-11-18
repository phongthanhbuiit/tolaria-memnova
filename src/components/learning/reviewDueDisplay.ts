import { DEFAULT_DATE_DISPLAY_FORMAT, formatDateTimeForDisplay, type DateDisplayFormat } from '../../utils/dateDisplay'
import { getLocaleDateLocale, translate, type AppLocale } from '../../lib/i18n'

function localDay(date: Date): number {
  // Map each instant to its local civil day before subtracting across DST.
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000)
}

function wholeMonths(earlier: Date, later: Date): number {
  const months = (later.getFullYear() - earlier.getFullYear()) * 12 + later.getMonth() - earlier.getMonth()
  return months - Number(later.getDate() < earlier.getDate())
}

/** Format the existing FSRS timestamp for display in the user's local calendar. */
export function createReviewDueFormatter(locale: AppLocale, clock: number, format: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT) {
  const dateLocale = getLocaleDateLocale(locale)
  const now = new Date(clock)
  const today = localDay(now)
  const relative = new Intl.RelativeTimeFormat(dateLocale, { numeric: 'always' })
  const durations = {
    day: new Intl.NumberFormat(dateLocale, { style: 'unit', unit: 'day', unitDisplay: 'long' }),
    month: new Intl.NumberFormat(dateLocale, { style: 'unit', unit: 'month', unitDisplay: 'long' }),
  }

  return (timestamp: string | undefined | null) => {
    if (!timestamp) return null
    const date = new Date(timestamp)
    const days = localDay(date) - today
    if (!Number.isFinite(days)) return null
    if (days === 0) return { absolute: formatDateTimeForDisplay(date, format, locale), relative: translate(locale, 'editor.schedule.dueToday') }
    const months = days < 0 ? wholeMonths(date, now) : wholeMonths(now, date)
    const unit = months > 0 ? 'month' : 'day'
    const count = months > 0 ? months : Math.abs(days)
    const relativeLabel = days < 0 || locale === 'vi'
      ? translate(locale, days < 0 ? 'learning.noteMemory.overdueBy' : 'learning.noteMemory.dueIn', { duration: durations[unit].format(count) })
      : relative.format(count, unit)
    return { absolute: formatDateTimeForDisplay(date, format, locale), relative: relativeLabel }
  }
}

export function formatStudyInterval(locale: AppLocale, amount: number, unit: Intl.RelativeTimeFormatUnit): string {
  const label = new Intl.RelativeTimeFormat(locale, { numeric: 'always', style: 'long' }).format(amount, unit)
  return locale === 'vi' ? label.replace(/^sau\s+(.+\s+nữa)$/u, '$1') : label
}
