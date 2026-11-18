import { expect, type Page } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from './fixtureVault'

export async function openFlashcardModeFixture(page: Page, backs: readonly string[]) {
  const root = createFixtureVaultCopy()
  try {
    await openFixtureVault(page, root, { preserveLearningState: true })
    await page.evaluate(async ({ root, backs }) => {
      const modulePath = '/src/lib/learning/client.ts'
      const { LearningClient } = await import(modulePath)
      const client = await LearningClient.connect(root)
      const owner = await client.ensurePage('project/alpha-project.md')
      for (const [index, back] of backs.entries()) {
        await client.createCard(owner.id, {
          front: `Practice prompt ${index + 1}`, back, answerMode: 'inline',
          status: 'active', position: index, properties: {},
        })
      }
    }, { root, backs })
    await page.reload()
    await page.getByRole('button', { name: /^All Notes/ }).click()
    await page.getByTestId('note-list-container').getByText('Alpha Project', { exact: true }).click()
    await page.getByRole('tab', { name: 'Memorization', exact: true }).click()
    const retained = page.getByRole('button', { name: /^Old cards \(\d+\)$/ })
    if (await retained.count() && await retained.getAttribute('aria-expanded') !== 'true') await retained.click()
    const region = page.getByRole('region', { name: 'Flashcards', exact: true })
    const picker = region.getByRole('combobox', { name: 'Study mode', exact: true })
    await expect(picker).toBeVisible()
    return { root, picker }
  } catch (error) {
    removeFixtureVaultCopy(root)
    throw error
  }
}

export async function chooseFlashcardMode(page: Page, picker: ReturnType<Page['getByRole']>, label: string) {
  await picker.click()
  await page.getByRole('option', { name: label, exact: true }).click()
  await page.getByRole('region', { name: 'Flashcards', exact: true }).getByRole('button', { name: 'Study', exact: true }).click()
  return page.getByRole('dialog')
}
