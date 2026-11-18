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

test('editable drawing keeps its scene when the app language changes', async ({ page }) => {
  await page.goto('/tests/fixtures/note-memory-layout.html')
  await page.waitForFunction(() => window.setNoteLayoutCase)
  const setLocale = (locale: 'en' | 'vi') => page.evaluate(locale => {
    window.setNoteLayoutCase?.({ surface: 'whiteboard', locale, theme: 'light' })
  }, locale)
  await setLocale('en')
  const drawing = page.getByRole('group', { name: 'Excalidraw', exact: true })
  await expect(drawing.getByRole('button', { name: 'Zoom in', exact: true })).toBeVisible()
  await drawing.getByTestId('toolbar-rectangle').locator('..').click()
  const canvas = drawing.locator('canvas.interactive')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Missing drawing surface')
  await page.mouse.move(box.x + box.width * 0.65, box.y + 170)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.8, box.y + 215, { steps: 8 })
  await page.mouse.up()
  await expect(drawing.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled()

  await setLocale('vi')
  await expect(drawing.getByRole('button', { name: 'Phóng to', exact: true })).toBeVisible()
  await expect(drawing.getByRole('button', { name: 'Hoàn tác', exact: true })).toBeEnabled()
  await expect(drawing.getByRole('button', { name: 'Công cụ khác', exact: true })).toBeVisible()
  await expect(drawing.getByRole('button', { name: 'Thu nhỏ', exact: true })).toBeVisible()
  await expect(drawing.getByRole('button', { name: 'Làm lại', exact: true })).toBeDisabled()
  await expect(drawing.getByRole('button', { name: 'Trợ giúp', exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
  await setLocale('en')
  await expect(drawing.getByRole('button', { name: 'Zoom in', exact: true })).toBeVisible()
  await expect(drawing.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled()
  await expect(drawing.getByRole('button', { name: 'More tools', exact: true })).toBeVisible()
})
