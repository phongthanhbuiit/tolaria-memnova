import { test, expect } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { openCommandPalette, findCommand } from './helpers'

test.use({ locale: 'en-US' })

test('vault guidance restore command recovers missing managed guidance', async ({ page }) => {
  const vault = createFixtureVaultCopy()
  try {
    await page.route('**/src/mock-tauri/mock-handlers.ts*', async route => {
      const response = await route.fetch()
      const source = await response.text()
      await route.fulfill({
        response,
        body: source + '\nmockVaultAiGuidanceStatus = { agents_state: "managed", claude_state: "managed", gemini_state: "missing", can_restore: true };',
      })
    })
    await openFixtureVault(page, vault)
    await page.getByTestId('note-list-container').getByText('Alpha Project', { exact: true }).click()
    await page.getByRole('button', { name: 'Open the AI panel', exact: true }).first().click()

    const ai = page.getByTestId('ai-workspace')
    const warning = ai.getByText('Library guidance needs attention: GEMINI.md is missing. Choose Restore to create the guidance file.')
    await expect(warning).toBeVisible()
    await expect(ai.getByRole('button', { name: 'Restore', exact: true })).toBeVisible()

    await openCommandPalette(page)
    expect(await findCommand(page, 'Restore Memnova AI Guidance')).toBe(true)
    await page.keyboard.press('Enter')

    await expect(page.getByText('Memnova AI guidance restored')).toBeVisible()
    await expect(warning).toHaveCount(0)
    await expect(ai.getByRole('button', { name: 'Restore', exact: true })).toHaveCount(0)
    await openCommandPalette(page)
    expect(await findCommand(page, 'Restore Memnova AI Guidance')).toBe(false)
  } finally {
    await page.close()
    removeFixtureVaultCopy(vault)
  }
})
