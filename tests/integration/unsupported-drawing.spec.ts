import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'

test('the editor preserves the unsupported drawing and exposes the original source on request', async ({ page }) => {
  const root = createFixtureVaultCopy()
  const file = path.join(root, 'old-drawing.md')
  const content = '# Old drawing\n\n~~~whiteboard id="old"\n{"privateShape":"existing"}\n~~~\n'
  fs.writeFileSync(file, content)
  try {
    await openFixtureVault(page, root)
    await page.getByTestId('note-list-container').getByText('Old drawing', { exact: true }).click()
    const notice = page.getByRole('note').filter({ hasText: 'This drawing uses an unsupported legacy format.' })
    await expect(notice).toBeVisible()
    await expect(notice).not.toContainText('privateShape')
    await notice.getByRole('button', { name: 'View source' }).click()
    await expect(page.getByText('{"privateShape":"existing"}', { exact: true })).toBeVisible()
    expect(fs.readFileSync(file, 'utf8')).toBe(content)
  } finally {
    await page.close()
    removeFixtureVaultCopy(root)
  }
})
