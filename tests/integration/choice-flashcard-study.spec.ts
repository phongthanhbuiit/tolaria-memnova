import { expect, test } from '@playwright/test'
import { chooseFlashcardMode, openFlashcardModeFixture } from '../helpers/flashcardModeFixture'
import { removeFixtureVaultCopy } from '../helpers/fixtureVault'

test('the deck offers four distinct answers and waits for a scheduled grade', async ({ page }) => {
  const { root, picker } = await openFlashcardModeFixture(page, ['Lima', 'Hà Nội', 'Oslo', 'Riga'])
  try {
    const dialog = await chooseFlashcardMode(page, picker, 'Multiple choice')
    const group = dialog.getByRole('group', { name: 'Multiple-choice answers' })
    const options = group.getByRole('button')
    await expect(options).toHaveCount(4)
    for (const answer of ['Lima', 'Hà Nội', 'Oslo', 'Riga']) await expect(group.getByText(answer, { exact: true })).toBeVisible()
    await expect(options.first()).toBeEnabled()
    await options.first().focus()
    await page.keyboard.press('D')
    const feedback = group.getByRole('status')
    await expect(feedback).toHaveText(/^(Correct|Incorrect)$/)
    await expect(feedback).not.toHaveAttribute('tabindex')
    const result = (await feedback.innerText()) === 'Correct' ? 3 : 1
    await expect(dialog.locator(`[data-note-grade="${result}"]`)).toBeFocused()
    const ratings = () => page.evaluate(root => {
      const data = JSON.parse(localStorage.getItem(`memnova:qa-learning:${root}`) ?? '{}')
      return (data.reviews ?? []).map((review: { request: { rating: number } }) => review.request.rating)
    }, root)
    expect(await ratings()).toEqual([])
    await page.keyboard.press('4')
    await expect.poll(ratings).toEqual([4])
  } finally {
    await page.close()
    removeFixtureVaultCopy(root)
  }
})

test('short decks show why multiple choice is disabled', async ({ page }) => {
  const { root, picker } = await openFlashcardModeFixture(page, ['Lima', 'Oslo', 'Riga'])
  try {
    await expect(picker).toHaveAccessibleDescription(/need 4 cards/)
    await picker.click()
    await expect(page.getByRole('option', { name: 'Multiple choice' })).toBeDisabled()
  } finally {
    await page.close()
    removeFixtureVaultCopy(root)
  }
})
