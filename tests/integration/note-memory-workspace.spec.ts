import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import {
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'
import { executeCommand, openCommandPalette } from '../smoke/helpers'
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
    await page.getByRole('tab', { name: 'Memorization', exact: true }).click()
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
    await page
      .getByRole('button', { name: 'Add mnemonic', exact: true })
      .click()
    await expect(
      page.getByRole('tab', { name: 'Mnemonic', exact: true })
    ).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('button', { name: 'Choose a source', exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Article', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Choose a source', exact: true })).toBeHidden()
    await page.getByRole('tab', { name: 'Mnemonic', exact: true }).click()
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
    await page.getByRole('tab', { name: 'Memorization', exact: true }).click()
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
    await expect(panel.getByRole('button', { name: 'Study', exact: true })).toBeFocused()
    expect(fs.readFileSync(owner, 'utf8')).toBe(beforeReview)
    await page
      .getByRole('button', { name: 'Pause memorization', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Resume', exact: true })
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

for (const separator of ['\n\n', '\n']) {
test(`ordinary note editing retains a literal two-face marker without enabling learning (${separator.length === 1 ? 'no blank lines' : 'blank lines'})`, async ({ page }) => {
  const root = createNoteMemoryFixture()
  const owner = path.join(root, 'project/alpha-project.md')
  const source = `# Alpha Project\n\nOrdinary article.${separator}<!-- FLASHCARD:BACK -->${separator}This marker is an ordinary note example.\n`
  fs.writeFileSync(owner, source)
  try {
    await openFixtureVault(page, root, { preserveLearningState: true })
    await page.getByRole('button', { name: /^All Notes/ }).click()
    await page.getByTestId('note-list-container').getByText('Alpha Project', { exact: true }).click()
    await expect(page.getByRole('tab', { name: 'Mnemonic', exact: true })).toHaveCount(0)
    await expect(page.locator('.bn-editor')).not.toContainText('@@MEMNOVA_LITERAL_NOTE_MARKER:')
    const paragraph = page.locator('.bn-editor [data-content-type="paragraph"]').last()
    await paragraph.click(); await page.keyboard.press('End'); await page.keyboard.insertText(' Added ordinary text.'); await page.keyboard.press('Meta+s')
    await expect.poll(() => fs.readFileSync(owner, 'utf8')).toContain('Added ordinary text.')
    const saved = fs.readFileSync(owner, 'utf8')
    expect(saved).toContain('<!-- FLASHCARD:BACK -->')
    expect(saved).toContain('Ordinary article.')
    expect(saved).not.toContain('_memnova_learning_')
    expect(saved).not.toContain('_memnova_page_id')
    await page.getByRole('tab', { name: 'Memorization', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Enable memorization', exact: true })).toBeEnabled()
    expect(fs.readFileSync(owner, 'utf8')).toBe(saved)
    await page.getByRole('tab', { name: 'Content', exact: true }).click()
    await openCommandPalette(page); await executeCommand(page, 'Toggle Raw')
    const raw = page.locator('.cm-content')
    await expect(raw).toContainText('<!-- FLASHCARD:BACK -->')
    await raw.fill(saved.replace('<!-- FLASHCARD:BACK -->', ''))
    await page.keyboard.press('Meta+s')
    await expect.poll(() => fs.readFileSync(owner, 'utf8')).not.toContain('<!-- FLASHCARD:BACK -->')
    await openCommandPalette(page); await executeCommand(page, 'Toggle Raw')
    await expect(page.locator('.bn-editor')).toContainText('Added ordinary text.')
    await paragraph.click(); await page.keyboard.press('End'); await page.keyboard.insertText(' No marker should return.'); await page.keyboard.press('Meta+s')
    await expect.poll(() => fs.readFileSync(owner, 'utf8')).toContain('No marker should return.')
    expect(fs.readFileSync(owner, 'utf8')).not.toContain('<!-- FLASHCARD:BACK -->')
  } finally { removeFixtureVaultCopy(root) }
})
}
