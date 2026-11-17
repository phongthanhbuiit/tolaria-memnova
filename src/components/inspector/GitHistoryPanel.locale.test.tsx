import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GitHistoryPanel } from './GitHistoryPanel'
import { AppPreferencesProvider } from '../../hooks/useAppPreferences'

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 17, 12)) })
afterEach(() => { cleanup(); vi.useRealTimers() })
describe('R-01 Git history relative dates', () => {
  it.each([
    ['en', ['today', 'yesterday', '2 days ago', '5 days ago', 'last month', '2 months ago', '5 months ago']],
    ['vi', ['Hôm nay', 'Hôm qua', 'Hôm kia', '5 ngày trước', 'tháng trước', '2 tháng trước', '5 tháng trước']],
    ['ru-RU', ['сегодня', 'вчера', 'позавчера', '5 дней назад', 'в прошлом месяце', '2 месяца назад', '5 месяцев назад']],
  ] as const)('formats days/months with native plural rules in %s', (locale, expected) => {
    const now = Date.now() / 1000
    const commits = [0, 1, 2, 5, 30, 60, 150].map((days, i) => ({ hash: String(i), shortHash: String(i), message: `revision ${i}`, author: '', date: now - days * 86400 }))
    const onViewCommitDiff = vi.fn()
    render(<AppPreferencesProvider locale={locale}><GitHistoryPanel commits={commits} onViewCommitDiff={onViewCommitDiff} /></AppPreferencesProvider>)
    for (const text of expected) expect(screen.getByText(text)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /revision 2/ }))
    expect(onViewCommitDiff).toHaveBeenCalledWith('2')
  })
  it('updates existing history when the language changes', () => {
    const panel = <GitHistoryPanel commits={[{ hash: '1', shortHash: '1', message: 'revision', author: '', date: Date.now() / 1000 }]} />
    const view = render(<AppPreferencesProvider locale="en">{panel}</AppPreferencesProvider>)
    expect(screen.getByText('today')).toBeInTheDocument()
    view.rerender(<AppPreferencesProvider locale="vi">{panel}</AppPreferencesProvider>)
    expect(screen.getByText('Hôm nay')).toBeInTheDocument()
  })
})
