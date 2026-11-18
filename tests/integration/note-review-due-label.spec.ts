import { expect, test } from '@playwright/test'

const clock = Date.parse('2026-03-09T01:00:00Z')
const cases = [
  {
    timeZone: 'Asia/Ho_Chi_Minh',
    overdue: 'Quá hạn 2 ngày',
    today: 'Đến hạn hôm nay',
    future: 'Còn 2 ngày',
  },
  {
    timeZone: 'America/Los_Angeles',
    overdue: 'Quá hạn 1 ngày',
    today: 'Còn 1 ngày',
    future: 'Còn 2 ngày',
  },
]

for (const { timeZone, overdue, today, future } of cases) {
  test(`learning dates use the calendar and absolute tooltip in ${timeZone}`, async ({ browser }, info) => {
    const context = await browser.newContext({ baseURL: info.project.use.baseURL, timezoneId: timeZone })
    try {
      const page = await context.newPage()
      await page.goto('/tests/fixtures/note-memory-layout.html')
      await page.waitForFunction(() => window.setNoteLayoutCase)
      const dates = [
        ['2026-03-07T12:00:00Z', overdue],
        ['2026-03-09T07:01:00Z', today],
        ['2026-03-11T01:00:00Z', future],
        ['2025-05-09T01:00:00Z', 'Quá hạn 10 tháng'],
      ]
      for (const [due, expected] of dates) {
        await page.evaluate(({ clock, due }) => window.setNoteLayoutCase?.({
          surface: 'dashboard', locale: 'vi', theme: 'light', clock, due,
        }), { clock, due })
        const row = page.getByRole('button', { name: /^A4 article/ })
        const time = row.locator('time')
        await expect(time).toHaveAttribute('datetime', due)
        await expect(time).toContainText(expected)
        const absolute = await page.evaluate(({ due, timeZone }) => {
          const date = new Date(due)
          const day = new Intl.DateTimeFormat('vi-VN', {
            year: 'numeric', month: 'long', day: 'numeric', timeZone,
          }).format(date)
          const time = new Intl.DateTimeFormat('vi-VN', {
            hour: 'numeric', minute: '2-digit', timeZone,
          }).format(date)
          return `${day} · ${time}`
        }, { due, timeZone })
        await row.hover()
        await expect(page.getByRole('tooltip')).toHaveText(absolute)
        await page.keyboard.press('Escape')
        await expect(page.getByRole('tooltip')).toBeHidden()
        await row.focus()
        await expect(page.getByRole('tooltip')).toHaveText(absolute)
        await expect(row).toHaveAccessibleDescription(new RegExp(expected))
        await page.keyboard.press('Escape')
        await row.blur()
        await page.mouse.move(0, 0)
      }
      await page.evaluate(() => window.setNoteLayoutCase?.({
        surface: 'dashboard', locale: 'en', theme: 'light', clock: Date.parse('2026-03-09T01:00:00Z'), due: '2026-03-11T01:00:00Z',
      }))
      await expect(page.locator('time')).toContainText('in 2 days')
    } finally {
      await context.close()
    }
  })
}
