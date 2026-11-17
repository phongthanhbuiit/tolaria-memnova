import { expect, test } from '@playwright/test'

const dimensions = { default: 32, md: 32, xs: 28, sm: 28, lg: 36, toolbar: 28, 'study-grade': 56, 'study-reveal': 40, icon: 32, 'icon-xs': 28, 'icon-sm': 28, 'icon-md': 32, 'icon-lg': 36, 'icon-inline': 24.5 }

test('every Button size has its declared rendered dimensions in both themes', async ({ page }) => {
  await page.goto('/tests/fixtures/icon-button-sizes.html')
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
    for (const [size, height] of Object.entries(dimensions)) {
      const button = page.getByRole('button', { name: size, exact: true })
      await expect(button).toBeVisible()
      const box = await button.boundingBox()
      expect(box?.height, `${theme}/${size} height`).toBe(height)
      if (size.startsWith('icon')) expect(box?.width, `${theme}/${size} width`).toBe(height)
    }
  }
})

test('compact AI and property actions use targets above the 24px minimum and remain operable', async ({ page }) => {
  await page.goto('/tests/fixtures/icon-button-sizes.html')
  for (const label of ['New AI chat', 'Close AI panel', 'Regenerate response', 'Copy response', 'Fork chat from here', 'Remove Lesson']) {
    const button = page.getByRole('button', { name: label, exact: true })
    await expect(button).toBeAttached()
    const box = await button.boundingBox()
    expect([box?.width, box?.height], label).toEqual([24.5, 24.5])
  }
  await page.getByRole('button', { name: 'New AI chat', exact: true }).click()
  await expect(page.getByText('Last action: New chat', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Remove Lesson', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Last action: Remove link', { exact: true })).toBeVisible()
})
