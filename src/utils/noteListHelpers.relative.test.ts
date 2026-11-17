import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { relativeDate } from './noteListHelpers'

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 17, 12)) })
afterEach(() => vi.useRealTimers())
describe('R-01 note list relative dates', () => {
  it.each([
    ['en', ['now', '1 minute ago', '2 minutes ago', '5 minutes ago', '2 hours ago', '3 days ago'], 'Nov 7', 'Nov 18'],
    ['vi', ['bây giờ', '1 phút trước', '2 phút trước', '5 phút trước', '2 giờ trước', '3 ngày trước'], '7 thg 11', '18 thg 11'],
    ['ru-RU', ['сейчас', '1 минуту назад', '2 минуты назад', '5 минут назад', '2 часа назад', '3 дня назад'], '7 нояб.', '18 нояб.'],
  ] as const)('formats relative and absolute branches in %s', (locale, expected, oldDate, futureDate) => {
    const now = Date.now() / 1000
    for (const [index, seconds] of [30, 60, 120, 300, 7200, 259200].entries()) {
      expect(relativeDate(now - seconds, locale)).toBe(expected[index])
    }
    expect(relativeDate(now - 10 * 86400, locale)).toBe(oldDate)
    expect(relativeDate(now + 86400, locale)).toBe(futureDate)
    expect(relativeDate(null, locale)).toBe('')
  })
  it('keeps the existing minute/hour/day thresholds', () => {
    const now = Date.now() / 1000
    expect(relativeDate(now - 59, 'en')).toBe('now')
    expect(relativeDate(now - 60, 'en')).toBe('1 minute ago')
    expect(relativeDate(now - 3599, 'en')).toBe('59 minutes ago')
    expect(relativeDate(now - 3600, 'en')).toBe('1 hour ago')
    expect(relativeDate(now - 86399, 'en')).toBe('23 hours ago')
    expect(relativeDate(now - 86400, 'en')).toBe('yesterday')
    expect(relativeDate(now - 604800, 'en')).toBe('Nov 10')
  })
})
