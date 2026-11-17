import { describe, expect, it } from 'vitest'
import {
  formatDatePartsForDisplay,
  formatDateValueForDisplay,
  formatTimestampForDateDisplay,
  normalizeDateDisplayFormat,
} from './dateDisplay'

describe('dateDisplay', () => {
  it('normalizes supported date display formats', () => {
    expect(normalizeDateDisplayFormat(' ISO ')).toBe('iso')
    expect(normalizeDateDisplayFormat('friendly')).toBe('friendly')
    expect(normalizeDateDisplayFormat('long')).toBeNull()
    expect(normalizeDateDisplayFormat(null)).toBeNull()
  })

  it('formats date parts in every supported display style', () => {
    const parts = { year: 2026, month: 5, day: 11 }

    expect(formatDatePartsForDisplay(parts, 'us')).toBe('5/11/2026')
    expect(formatDatePartsForDisplay(parts, 'european')).toBe('11/5/2026')
    expect(formatDatePartsForDisplay(parts, 'friendly')).toBe('May 11, 2026')
    expect(formatDatePartsForDisplay(parts, 'iso')).toBe('2026-05-11')
  })

  it('formats ISO and slash date values without changing non-dates', () => {
    expect(formatDateValueForDisplay('2026-05-11', 'european')).toBe('11/5/2026')
    expect(formatDateValueForDisplay('05/11/2026', 'friendly')).toBe('May 11, 2026')
    expect(formatDateValueForDisplay('next Monday', 'iso')).toBe('next Monday')
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
