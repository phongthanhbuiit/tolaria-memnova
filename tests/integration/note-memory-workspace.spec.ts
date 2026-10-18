import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import {
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'
import { createNoteMemoryFixture } from '../helpers/noteMemoryFixture'

test('explicit note enable, mnemonic editing, study and pause use the default workspace', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  const root = createNoteMemoryFixture()
  const owner = path.join(root, 'project/alpha-project.md')
  const original = fs.readFileSync(owner, 'utf8')
  const sourcePath = path.join(root, 'memory-fixtures/source.md')
  const source = fs.readFileSync(sourcePath, 'utf8')
  try {
    await openFixtureVault(page, root, { preserveLearningState: true })
    await page.getByRole('button', { name: /^All Notes/ }).click()
    await page
      .getByTestId('note-list-container')
      .getByText('Alpha Project', { exact: true })
      .click()
    await page.getByRole('tab', { name: 'Flashcards', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Enable memorization', exact: true })
    ).toBeEnabled()
    expect(fs.readFileSync(owner, 'utf8')).toBe(original)
    await expect(
      page.getByRole('button', { name: 'Add card', exact: true })
    ).toHaveCount(0)
    await page
      .getByRole('button', { name: 'Enable memorization', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Pause memorization', exact: true })
    ).toBeEnabled()
    await expect
      .poll(() => fs.readFileSync(owner, 'utf8'))
      .toContain('_memnova_learning_enabled: true')
    await page.getByRole('tab', { name: 'Content', exact: true }).click()
    await page
      .getByRole('button', { name: 'Add mnemonic', exact: true })
      .click()
    await expect(
      page.getByRole('tab', { name: 'Mnemonic', exact: true })
    ).toHaveAttribute('aria-selected', 'true')
    const editor = page.locator('.bn-editor [contenteditable=true]').first()
    const input = (await editor.count())
      ? editor
      : page.locator('.bn-editor[contenteditable=true]').first()
    await input.click()
    await page.keyboard.type('A red membrane surrounds a blue nucleus.')
    await page.keyboard.press('Meta+s')
    await expect
      .poll(() => fs.readFileSync(owner, 'utf8'))
      .toContain('A red membrane surrounds a blue nucleus.')
    await page.getByRole('tab', { name: 'Flashcards', exact: true }).click()
    const panel = page.getByRole('region', { name: 'Note memory', exact: true })
    await expect(
      panel.getByRole('button', { name: 'Study', exact: true })
    ).toBeEnabled()
    await panel.getByRole('button', { name: 'Study', exact: true }).click()
    const study = page.getByRole('dialog')
    await study
      .getByRole('button', { name: 'Show mnemonic', exact: true })
      .click()
    await expect(study).toContainText(
      'A red membrane surrounds a blue nucleus.'
    )
    await expect(study.getByRole('button', { name: /^Good/ })).toBeEnabled()
    const beforeReview = fs.readFileSync(owner, 'utf8')
    await study.getByRole('button', { name: /^Good/ }).click()
    await study.getByRole('button', { name: 'Close', exact: true }).click()
    expect(fs.readFileSync(owner, 'utf8')).toBe(beforeReview)
    await page
      .getByRole('button', { name: 'Pause memorization', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Enable memorization', exact: true })
    ).toBeEnabled()
    expect(fs.readFileSync(owner, 'utf8')).toBe(
      beforeReview.replace(
        '_memnova_learning_enabled: true',
        '_memnova_learning_enabled: false'
      )
    )
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(source)
    await page.screenshot({
      path: testInfo.outputPath('note-memory-paused.png'),
    })
  } finally {
    removeFixtureVaultCopy(root)
  }
})
