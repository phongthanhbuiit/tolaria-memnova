import { expect, test, type Locator } from '@playwright/test'

async function expectVisibleOutline(target: Locator) {
  await expect(target).toBeFocused()
  const focus = await target.evaluate(element => {
    const style = getComputedStyle(element)
    return { visible: element.matches(':focus-visible'), width: parseFloat(style.outlineWidth), style: style.outlineStyle, color: style.outlineColor }
  })
  expect(focus.visible).toBe(true)
  expect(focus.width).toBeGreaterThanOrEqual(2)
  expect(focus.style).not.toBe('none')
  expect(focus.color).not.toBe('rgba(0, 0, 0, 0)')
}
for (const theme of ['light', 'dark']) {
  test(`${theme}: Tab reveals focus on tab panel, input and rich chat draft`, async ({ page }) => {
    await page.goto('/tests/fixtures/a11y-focus.html')
    await page.getByRole('button', { name: 'Search', exact: true }).waitFor()
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Search', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('tab')).toBeFocused()
    await page.keyboard.press('Tab')
    await expectVisibleOutline(page.getByRole('tabpanel'))
    await page.keyboard.press('Tab')
    await expectVisibleOutline(page.getByRole('textbox', { name: 'Name' }))
    await page.keyboard.press('Tab')
    await expectVisibleOutline(page.locator('[contenteditable="true"]'))
  })
  test(`${theme}: global search input exposes keyboard focus`, async ({ page }) => {
    await page.goto('/tests/fixtures/a11y-focus.html')
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expectVisibleOutline(page.locator('input[placeholder="Search in all notes..."]'))
  })
}

test('forced colors: keyboard focus survives without box-shadow rings', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/tests/fixtures/a11y-focus.html')
  await page.getByRole('tab').focus()
  await page.keyboard.press('Tab')
  await expectVisibleOutline(page.getByRole('tabpanel'))
  await page.keyboard.press('Tab')
  await expectVisibleOutline(page.getByRole('textbox', { name: 'Name' }))
  await page.keyboard.press('Tab')
  await expectVisibleOutline(page.locator('[contenteditable="true"]'))
})
