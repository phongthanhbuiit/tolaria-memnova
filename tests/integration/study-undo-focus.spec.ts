import { expect, test } from '@playwright/test'
// Real view, hook and readonly renderer; deterministic local storage transport.
// F8 releases the committed-data refresh, with no fixed sleep or retry.
test.use({ trace: 'retain-on-failure' })
for (const lane of ['note', 'legacy']) for (const rating of [1, 2, 3, 4]) {
  test(`${lane}: mouse Undo → Space → ${rating} survives a pending refresh`, async ({ page }) => {
    await page.goto(`/tests/fixtures/note-memory-study.html?undo-focus=1${lane === 'legacy' ? '&legacy=1' : ''}`)
    const reveal = page.getByRole('button', { name: lane === 'note' ? 'Show mnemonic' : 'Show answer', exact: true })
    await expect(reveal).toBeEnabled()
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.getByText('Saving…', { exact: true })).toBeVisible()
    await expect(reveal).toBeDisabled()
    await expect(page.getByRole('heading', { name: lane === 'note' ? 'A4 Article' : 'Legacy question', exact: true })).toBeVisible()
    // Let the rendered frame/effects settle while the transport gate stays closed.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await page.keyboard.press('F8')
    await expect(reveal).toBeEnabled()
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false)
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: /^Good 3/ })).toBeEnabled()
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false)
    await page.keyboard.press(String(rating))
    await expect(page.getByRole('heading', { name: 'Done', exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-last-rating', String(rating))
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })
}

for (const lane of ['note', 'legacy']) for (const rating of [1, 2, 3, 4]) {
  test(`${lane}: mouse Undo → Space → ${rating} with an unchanged card snapshot`, async ({ page }) => {
    await page.goto(`/tests/fixtures/note-memory-study.html?undo-focus=1&stable-snapshot=1${lane === 'legacy' ? '&legacy=1' : ''}`)
    const reveal = page.getByRole('button', { name: lane === 'note' ? 'Show mnemonic' : 'Show answer', exact: true })
    await expect(reveal).toBeEnabled()
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false)
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: /^Good 3/ })).toBeEnabled()
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false)
    await page.keyboard.press(String(rating))
    await expect(page.getByRole('heading', { name: 'Done', exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-last-rating', String(rating))
  })
}
