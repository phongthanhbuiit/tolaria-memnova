import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Calendar } from './calendar'
import { AppPreferencesProvider } from '../../hooks/useAppPreferences'

vi.unmock('react-day-picker')

const month = new Date(2026, 10, 16)
afterEach(cleanup)
describe('R-01 Calendar locale', () => {
  it.each([
    ['en', /Nov/, /Choose the Month/, /Monday, November 16th, 2026/],
    ['vi', /Thg 11/, /Chọn tháng/, /Thứ Hai, ngày 16 tháng 11 năm 2026/],
    ['ru-RU', /нояб/, /Выберите месяц/, /понедельник, 16 ноября 2026 г./],
  ] as const)('localizes visible and accessible date labels in %s', (appLocale, caption, monthLabel, dayLabel) => {
    const onSelect = vi.fn()
    render(<Calendar appLocale={appLocale} mode="single" defaultMonth={month} onSelect={onSelect} />)
    expect(screen.getByRole('combobox', { name: monthLabel })).toHaveTextContent(caption)
    fireEvent.click(screen.getByRole('button', { name: dayLabel }))
    expect(onSelect.mock.calls[0][0]).toEqual(month)
  })
  it('updates an open calendar from the effective app locale in the same session', () => {
    const calendar = <Calendar mode="single" defaultMonth={month} />
    const view = render(<AppPreferencesProvider locale="en">{calendar}</AppPreferencesProvider>)
    expect(screen.getByRole('combobox', { name: /Choose the Month/ })).toHaveTextContent('Nov')
    view.rerender(<AppPreferencesProvider locale="vi">{calendar}</AppPreferencesProvider>)
    expect(screen.getByRole('combobox', { name: 'Chọn tháng' })).toHaveTextContent('Thg 11')
    expect(document.body.textContent).not.toMatch(/November|Nov\b/)
  })
})

it('keeps six calendar weeks for both short and long months', () => {
  for (const displayed of [new Date(2027, 1, 1), new Date(2026, 10, 1)]) {
    const view = render(<Calendar appLocale="vi" mode="single" defaultMonth={displayed} />)
    const calendar = screen.getByRole('grid')
    expect(calendar.querySelectorAll('tbody tr')).toHaveLength(6)
    view.unmount()
  }
})
