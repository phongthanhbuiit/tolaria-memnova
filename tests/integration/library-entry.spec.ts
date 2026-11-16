import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { createNoteMemoryFixture } from '../helpers/noteMemoryFixture'

test('Library opens an ordinary Markdown file and starts a new writing tab', async ({ page }) => {
  const root = createNoteMemoryFixture()
  const file = path.join(root, 'project/alpha-project.md')
  const original = fs.readFileSync(file, 'utf8')
  const latest = new Date(Date.now() + 60_000)
  fs.utimesSync(file, latest, latest)
  try {
    await openFixtureVault(page, root)
    const home = page.getByRole('button', { name: 'Home', exact: true })
    const dashboard = page.locator('.app__dashboard')
    await home.click()
    await dashboard.getByRole('button', { name: 'All Notes', exact: true }).click({ timeout: 5000 })
    const list = page.getByTestId('note-list-container')
    await list.getByText('Alpha Project', { exact: true }).click()
    await expect(page.locator('.bn-editor').first()).toContainText('A cell keeps')
    expect(fs.readFileSync(file, 'utf8')).toBe(original)
    await home.click()
    await dashboard.getByRole('button', { name: 'New Note', exact: true }).click()
    await expect(dashboard).toHaveCount(0)
    await expect(page.locator('.bn-editor').first()).toBeVisible()
    await expect(page.locator('.bn-editor').first()).not.toContainText('A cell keeps')
    await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[contenteditable="true"]')))).toBe(true)
    await page.keyboard.type('Journal entry')
    await expect(page.getByRole('heading', { level: 1, name: 'Journal entry' })).toBeVisible()
    await page.keyboard.press('Enter')
    await page.keyboard.type('A plain Markdown paragraph.')
    await page.keyboard.press('Meta+s')
    await expect(page.locator('.bn-editor')).toContainText('A plain Markdown paragraph.')
  } finally {
    removeFixtureVaultCopy(root)
  }
})
