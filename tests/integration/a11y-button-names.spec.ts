import { expect, test } from '@playwright/test'

const surfaces = ['panel', 'dashboard', 'conversion', 'recovery', 'source', 'tabs', 'study', 'toolbar'] as const
for (const surface of surfaces) for (const locale of ['en', 'vi'] as const) {
  test(`${surface}/${locale}: rendered buttons expose accessible names`, async ({ page }) => {
    await page.goto('/tests/fixtures/note-memory-layout.html')
    await page.waitForFunction(() => typeof window.setNoteLayoutCase === 'function')
    await page.evaluate(({ surface, locale }) => window.setNoteLayoutCase?.({ surface, locale, theme: 'light' }), { surface, locale })
    await page.waitForFunction(({ surface, locale }) => document.documentElement.dataset.layoutCase === `${surface}:${locale}:light`, { surface, locale })
    expect(await page.getByRole('button').count()).toBeGreaterThan(0)
    await expect(page.getByRole('button', { name: /^$/ })).toHaveCount(0)
  })
}

test('editable drawing keeps its menu operable with a Vietnamese accessible name', async ({ page }) => {
  await page.goto('/tests/fixtures/note-memory-layout.html')
  await page.getByRole('button', { name: 'Review now', exact: true }).waitFor()
  await page.evaluate(() => window.setNoteLayoutCase?.({ surface: 'whiteboard', locale: 'vi', theme: 'light' }))
  const drawing = page.getByRole('group', { name: 'Excalidraw', exact: true })
  const trigger = drawing.getByTestId('main-menu-trigger')
  const menu = drawing.getByTestId('dropdown-menu')
  await expect(trigger).toHaveAttribute('aria-label', 'Menu bảng vẽ')
  await expect(trigger).toHaveAccessibleName('Menu bảng vẽ')
  await trigger.click()
  await expect(menu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await trigger.press('Enter')
  await expect(menu).toBeVisible()
})
