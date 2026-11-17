import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppPreferencesProvider } from '../../hooks/useAppPreferences'
import { DateValueInput } from './DateValueInput'

vi.unmock('react-day-picker')
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 17, 12)) })
afterEach(() => { cleanup(); vi.useRealTimers() })
describe('R-01 date filter', () => {
  it.each([
    ['en', 'November 16, 2026', 'Open date picker', /Wednesday, November 18th, 2026/],
    ['vi', '16 tháng 11, 2026', 'Mở bộ chọn ngày', /Thứ Tư, ngày 18 tháng 11 năm 2026/],
    ['ru-RU', '16 ноября 2026 г.', 'Открыть календарь', /среда, 18 ноября 2026 г./],
  ] as const)('localizes preview, title and aria in %s, saves the same ISO day', (locale, date, label, dayLabel) => {
    const onChange = vi.fn()
    render(<AppPreferencesProvider locale={locale}><DateValueInput value="2026-11-16" onChange={onChange} /></AppPreferencesProvider>)
    const trigger = screen.getByTestId('date-picker-trigger')
    expect(screen.getByTestId('date-value-input').getAttribute('placeholder')).not.toContain('ago')
    expect(trigger).toHaveAttribute('title', date)
    expect(trigger).toHaveAccessibleName(`${label} (${date})`)
    fireEvent.focus(screen.getByTestId('date-value-input'))
    expect(screen.getByTestId('date-value-preview')).toHaveTextContent(date)
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: dayLabel }))
    expect(onChange).toHaveBeenCalledWith('2026-11-18')
  })
  it('updates empty-picker labels in-session', () => {
    const field = <DateValueInput value="" onChange={vi.fn()} />
    const view = render(<AppPreferencesProvider locale="en">{field}</AppPreferencesProvider>)
    expect(screen.getByTestId('date-picker-trigger')).toHaveAttribute('title', 'Pick a date')
    view.rerender(<AppPreferencesProvider locale="vi">{field}</AppPreferencesProvider>)
    expect(screen.getByTestId('date-picker-trigger')).toHaveAttribute('title', 'Chọn ngày')
    expect(screen.getByTestId('date-picker-trigger')).toHaveAccessibleName('Mở bộ chọn ngày')
  })
})
