import { describe, expect, it } from 'vitest'
import {
  formatDateForDisplay,
  formatDatePartsForDisplay,
  formatDateValueForDisplay,
  formatTimestampForDateDisplay,
  normalizeDateDisplayFormat,
} from './dateDisplay'

describe('dateDisplay', () => {
  it.each([
    ['en', 'January 1, 2026'], ['vi', '1 tháng 1, 2026'], ['ru-RU', '1 января 2026 г.'],
  ] as const)('preserves date-only and local midnight boundaries in %s', (locale, expected) => {
    const localMidnight = new Date(2026, 0, 1)
    expect(formatDatePartsForDisplay({ year: 2026, month: 1, day: 1 }, undefined, locale)).toBe(expected)
    expect(formatDateValueForDisplay('2026-01-01', undefined, locale)).toBe(expected)
    expect(formatDateForDisplay(localMidnight, undefined, locale)).toBe(expected)
    expect(formatTimestampForDateDisplay(localMidnight.getTime() / 1000, undefined, locale)).toBe(expected)
  })

  it('normalizes supported date display formats', () => {
    expect(normalizeDateDisplayFormat(' ISO ')).toBe('iso')
    expect(normalizeDateDisplayFormat('friendly')).toBe('friendly')
    expect(normalizeDateDisplayFormat('long')).toBeNull()
    expect(normalizeDateDisplayFormat(null)).toBeNull()
  })

  it('formats date parts in every supported display style', () => {
    const parts = { year: 2026, month: 5, day: 11 }

    expect(formatDatePartsForDisplay(parts, 'us', 'en')).toBe('5/11/2026')
    expect(formatDatePartsForDisplay(parts, 'european', 'en')).toBe('11/5/2026')
    expect(formatDatePartsForDisplay(parts, 'friendly', 'en')).toBe('May 11, 2026')
    expect(formatDatePartsForDisplay(parts, 'iso', 'en')).toBe('2026-05-11')
  })

  it('formats ISO and slash date values without changing non-dates', () => {
    expect(formatDateValueForDisplay('2026-05-11', 'european', 'en')).toBe('11/5/2026')
    expect(formatDateValueForDisplay('05/11/2026', 'friendly', 'en')).toBe('May 11, 2026')
    expect(formatDateValueForDisplay('next Monday', 'iso', 'en')).toBe('next Monday')
  })

  it('localizes friendly dates while preserving the calendar day and explicit numeric styles', () => {
    const parts = { year: 2026, month: 11, day: 16 }
    expect(formatDatePartsForDisplay(parts, 'friendly', 'vi')).toBe('16 tháng 11, 2026')
    expect(formatDateValueForDisplay('2026-11-16', 'friendly', 'vi')).toBe('16 tháng 11, 2026')
    expect(formatDatePartsForDisplay(parts, 'friendly', 'fr-FR')).toBe('16 novembre 2026')
    expect(formatDatePartsForDisplay(parts, 'us', 'vi')).toBe('11/16/2026')
    expect(formatDatePartsForDisplay(parts, 'european', 'vi')).toBe('16/11/2026')
    expect(formatDatePartsForDisplay(parts, 'iso', 'vi')).toBe('2026-11-16')
    const localMidnight = new Date(2026, 10, 16).getTime() / 1000
    expect(formatTimestampForDateDisplay(localMidnight, 'friendly', 'vi')).toBe('16 tháng 11, 2026')
    expect(formatTimestampForDateDisplay(null, 'friendly', 'vi')).toBe('')
    expect(formatTimestampForDateDisplay(Number.POSITIVE_INFINITY, 'friendly', 'vi')).toBe('')
  })
})
