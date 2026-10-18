import { expect, test } from '@playwright/test'
// Real BlockNote/tldraw + media decode. Component fixture, not native persistence proof.
test('note study hides the article, waits for a readonly mnemonic canvas, returns without a rating and accepts one explicit grade', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/note-memory-study.html')
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('heading', { name: 'A4 Article', exact: true })
  ).toBeVisible()
  await expect(
    dialog.getByText('Stale SQL front', { exact: true })
  ).toHaveCount(0)
  await expect(dialog.locator('audio')).toHaveCount(0)
  await dialog
    .getByRole('button', { name: 'Show mnemonic', exact: true })
    .click()
  await expect(
    dialog.getByRole('heading', { name: 'A4 Article', exact: true })
  ).toHaveCount(0)
  await expect(
    dialog.getByRole('heading', { name: 'Visual memory', exact: true })
  ).toBeVisible()
  await expect(dialog.locator('.tldraw-whiteboard')).toBeVisible()
  await expect(
    dialog.getByRole('button', { name: 'Vocab Image', exact: true })
  ).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: /^Good/ })).toBeEnabled()
  await dialog.locator('.tldraw-whiteboard').scrollIntoViewIfNeeded()
  await expect
    .poll(() =>
      dialog
        .locator('.tldraw-whiteboard img.tl-image')
        .evaluateAll(
          (images) =>
            images.filter(
              (image) =>
                image instanceof HTMLImageElement && image.naturalWidth > 0
            ).length
        )
    )
    .toBeGreaterThanOrEqual(2)
  await page.screenshot({ path: '/tmp/memnova-m19-study-canvas.png' })
  await dialog
    .getByRole('button', { name: 'Return to article', exact: true })
    .click()
  await expect(
    dialog.getByRole('heading', { name: 'A4 Article', exact: true })
  ).toBeVisible()
  await expect(
    dialog.getByRole('heading', { name: 'Done', exact: true })
  ).toHaveCount(0)
  await dialog
    .getByRole('button', { name: 'Show mnemonic', exact: true })
    .focus()
  await page.keyboard.press('Space')
  await expect(dialog.getByRole('button', { name: /^Good/ })).toBeEnabled()
  await page.keyboard.press('3')
  await expect(
    dialog.getByRole('heading', { name: 'Done', exact: true })
  ).toBeVisible()
})
test('an unverified local mnemonic image blocks rating and exposes reload', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/note-memory-study.html?broken=1')
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Show mnemonic', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByRole('button', { name: /^Good/ })).toBeDisabled()
  await expect(
    dialog
      .getByRole('alert')
      .getByRole('button', { name: 'Reload', exact: true })
  ).toBeEnabled()
  await page.keyboard.press('3')
  await expect(
    dialog.getByRole('heading', { name: 'Done', exact: true })
  ).toHaveCount(0)
})

test('legacy Q/A still reveals by Space and grades by a numeric shortcut', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/note-memory-study.html?legacy=1')
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('heading', { name: 'Legacy question', exact: true })
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Show answer', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(dialog.getByText('Legacy answer', { exact: true })).toBeVisible()
  await expect(
    dialog.getByRole('heading', { name: 'Legacy question', exact: true })
  ).toBeVisible()
  await page.keyboard.press('3')
  await expect(
    dialog.getByRole('heading', { name: 'Done', exact: true })
  ).toBeVisible()
})
