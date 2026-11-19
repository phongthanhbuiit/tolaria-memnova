import { expect, test } from '@playwright/test'
import { chooseFlashcardMode, openFlashcardModeFixture } from '../helpers/flashcardModeFixture'
import { removeFixtureVaultCopy } from '../helpers/fixtureVault'

test('a paused ten-question challenge completes without changing any durable learning rows', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const { root, picker } = await openFlashcardModeFixture(page, ['Lima', 'Hà Nội', 'Oslo', 'Riga'])
  try {
    const stored = () => page.evaluate(root => localStorage.getItem(`memnova:qa-learning:${root}`), root)
    const before = await stored()
    expect(before).toContain('Practice prompt')
    await page.clock.install()
    const dialog = await chooseFlashcardMode(page, picker, 'Challenge')
    await expect(dialog.getByText('Practice only. Your review schedule stays the same.')).toBeVisible()
    await expect(dialog.locator('[class*="motion-safe:transition-"]')).toHaveCSS('transition-duration', '0s')
    await dialog.getByRole('button', { name: 'Pause', exact: true }).click()
    const timer = dialog.getByRole('timer')
    const time = await timer.innerText()
    await page.clock.runFor(25_000)
    await expect(timer).toHaveText(time)
    const resume = dialog.getByRole('button', { name: 'Resume', exact: true })
    await expect(resume).toHaveAttribute('data-variant', 'default')
    await resume.click()
    for (let round = 1; round <= 10; round++) {
      await dialog.getByRole('group', { name: 'Multiple-choice answers' }).getByRole('button').first().click()
      await dialog.getByRole('button', { name: round === 10 ? 'Finish challenge' : 'Next question', exact: true }).click()
    }
    await expect(dialog.getByRole('heading', { name: 'Challenge complete' })).toBeVisible()
    expect(await stored()).toBe(before)
  } finally {
    await page.close()
    removeFixtureVaultCopy(root)
  }
})

test('challenge gives a reason for disabling decks with too few eligible answers', async ({ page }) => {
  const { root, picker } = await openFlashcardModeFixture(page, ['Lima', 'Oslo', 'Riga', '![Map](map.png)'])
  try {
    await expect(picker).toHaveAccessibleDescription(/need 4 cards/)
    await picker.click()
    await expect(page.getByRole('option', { name: 'Challenge', exact: true })).toBeDisabled()
  } finally {
    await page.close()
    removeFixtureVaultCopy(root)
  }
})
