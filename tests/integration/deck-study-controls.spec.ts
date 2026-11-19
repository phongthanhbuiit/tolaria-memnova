import { expect, test } from '@playwright/test'
import { openFlashcardModeFixture } from '../helpers/flashcardModeFixture'
import { removeFixtureVaultCopy } from '../helpers/fixtureVault'

test('the Decks tab starts study from the selected deck only', async ({ page }) => {
  const { root } = await openFlashcardModeFixture(page, ['Lima', 'Hà Nội', 'Oslo', 'Riga'])
  try {
    await page.getByRole('button', { name: 'Study', exact: true }).first().click()
    const tab = page.getByRole('tab', { name: /^Decks/ })
    await tab.click()
    const panel = page.getByRole('tabpanel', { name: /^Decks/ })
    const decks = panel.getByRole('region', { name: 'Decks', exact: true })
    await expect(panel.getByRole('button', { name: 'Start Review', exact: true })).toHaveCount(0)
    await expect(panel.getByRole('combobox', { name: 'Study mode' })).toHaveCount(1)
    await expect(decks.getByRole('combobox', { name: 'Study mode' })).toBeEnabled()
    await decks.getByRole('button', { name: 'Study Deck', exact: true }).click()
    await expect(page.getByRole('dialog').getByText(/^Practice prompt/)).toBeVisible()
  } finally {
    await page.close()
    removeFixtureVaultCopy(root)
  }
})
