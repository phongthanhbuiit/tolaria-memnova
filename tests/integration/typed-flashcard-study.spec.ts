import { expect, test } from '@playwright/test'
import { chooseFlashcardMode, openFlashcardModeFixture } from '../helpers/flashcardModeFixture'
import { removeFixtureVaultCopy } from '../helpers/fixtureVault'

test('typed answers respect composition and require a separate confirmation before scheduling', async ({ page }) => {
  const { root, picker } = await openFlashcardModeFixture(page, ['Đất nước'])
  try {
    const dialog = await chooseFlashcardMode(page, picker, 'Type answers')
    const field = dialog.getByRole('textbox', { name: 'Your answer' })
    await field.fill('dat nuoc')
    await field.dispatchEvent('compositionstart')
    await field.dispatchEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true })
    await expect(dialog.getByText('Almost correct')).toHaveCount(0)
    await field.dispatchEvent('compositionend')
    await field.press('Enter')
    await expect(dialog.getByText('Almost correct')).toBeVisible()
    await expect(dialog.getByText('Đất nước')).toBeVisible()
    await expect(dialog.getByText('Suggested rating: Hard. Press Enter to use it.')).toBeVisible()
    const ratings = () => page.evaluate(root => {
      const data = JSON.parse(localStorage.getItem(`memnova:qa-learning:${root}`) ?? '{}')
      return (data.reviews ?? []).map((review: { request: { rating: number } }) => review.request.rating)
    }, root)
    expect(await ratings()).toEqual([])
    await page.keyboard.press('Enter')
    await expect.poll(ratings).toEqual([2])
  } finally {
    await page.close()
    removeFixtureVaultCopy(root)
  }
})
