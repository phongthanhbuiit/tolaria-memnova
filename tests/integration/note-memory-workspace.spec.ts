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
  const latest = new Date(Date.now() + 60_000)
  fs.utimesSync(owner, latest, latest)
  const original = fs.readFileSync(owner, 'utf8')
  const sourcePath = path.join(root, 'memory-fixtures/source.md')
  const source = fs.readFileSync(sourcePath, 'utf8')
  try {
    await openFixtureVault(page, root, { preserveLearningState: true })
    const modifiedYear = new Date(fs.statSync(owner).mtimeMs).getFullYear().toString()
    await page.getByRole('button', { name: /^All Notes/ }).click()
    const alphaDate = page.getByTestId('note-title-row')
      .filter({ hasText: 'Alpha Project' })
      .first()
      .locator('..')
      .getByTestId('note-date-row')
    await expect(alphaDate).toContainText(modifiedYear)
    await page
      .getByTestId('note-list-container')
      .getByText('Alpha Project', { exact: true })
      .click()
    const memory = page.getByRole('tab', { name: 'Review this note', exact: true })
    const content = page.getByRole('tab', { name: 'Note', exact: true })
    await expect(memory).toHaveCount(0)
    await expect(content).toHaveCount(0)
    const openProperties = page.getByRole('button', { name: 'Open the properties panel', exact: true })
    if (await openProperties.isVisible()) await openProperties.click()
    const repeat = page.getByRole('switch', { name: 'Include in review schedule', exact: true })
    await expect(repeat).not.toBeChecked()
    expect(fs.readFileSync(owner, 'utf8')).toBe(original)
    const inspectorScroll = repeat.locator('xpath=ancestor::aside[1]').locator('.app-scrollbar')
    await expect(inspectorScroll).toHaveCSS('scrollbar-width', 'thin')
    await page.emulateMedia({ contrast: 'more' })
    await expect(inspectorScroll).toHaveCSS('scrollbar-width', 'auto')
    await page.emulateMedia({ contrast: 'no-preference' })
    await repeat.click()
    await expect(repeat).toBeChecked()
    await expect(page.getByRole('tablist')).toHaveCount(0)
    await expect
      .poll(() => fs.readFileSync(owner, 'utf8'))
      .toContain('_memnova_learning_enabled: true')
    await page
      .getByRole('button', { name: 'Add mnemonic', exact: true })
      .click()
    const backToNote = page.getByRole('button', { name: 'Back to note', exact: true })
    await expect(backToNote).toBeVisible()
    await expect(page.getByRole('button', { name: 'Choose a source', exact: true })).toBeVisible()
    await backToNote.click()
    await expect(page.getByRole('button', { name: 'Choose a source', exact: true })).toBeHidden()
    await page.getByRole('button', { name: 'Edit mnemonic', exact: true }).click()
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
    const panel = page.getByRole('region', { name: 'Note memory', exact: true })
    await expect(
      panel.getByRole('button', { name: 'Review now', exact: true })
    ).toBeEnabled()
    const studyTrigger = panel.getByRole('button', { name: 'Review now', exact: true })
    await studyTrigger.evaluate(element => element.addEventListener('mousedown', event => event.preventDefault()))
    await studyTrigger.click()
    const study = page.getByRole('dialog')
    await expect(study).toBeVisible()
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
    await expect(studyTrigger).toBeFocused()
    expect(fs.readFileSync(owner, 'utf8')).toBe(beforeReview)
    await repeat.click()
    await expect(repeat).not.toBeChecked()
    await expect(memory).toHaveCount(0)
    await expect(backToNote).toBeHidden()
    await expect(page.getByRole('tablist')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Edit mnemonic', exact: true })).toBeVisible()
    await expect(page.locator('.bn-editor:visible')).toBeVisible()
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
    await repeat.focus()
    await page.keyboard.press('Space')
    await expect(page.getByRole('tablist')).toHaveCount(0)
    await expect(repeat).toBeChecked()
    expect(fs.readFileSync(owner, 'utf8')).toBe(beforeReview)
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
  const latest = new Date(Date.now() + 60_000)
  fs.utimesSync(owner, latest, latest)
  try {
    await openFixtureVault(page, root, { preserveLearningState: true })
    await page.getByRole('button', { name: /^All Notes/ }).click()
    await page.getByTestId('note-list-container').getByText('Alpha Project', { exact: true }).click()
    await expect(page.getByRole('tab', { name: 'Memory cue', exact: true })).toHaveCount(0)
    await expect(page.locator('.bn-editor')).not.toContainText('@@MEMNOVA_LITERAL_NOTE_MARKER:')
    const paragraph = page.locator('.bn-editor [data-content-type="paragraph"]').last()
    await paragraph.click(); await page.keyboard.press('End'); await page.keyboard.insertText(' Added ordinary text.'); await page.keyboard.press('Meta+s')
    await expect.poll(() => fs.readFileSync(owner, 'utf8')).toContain('Added ordinary text.')
    const saved = fs.readFileSync(owner, 'utf8')
    expect(saved).toContain('<!-- FLASHCARD:BACK -->')
    expect(saved).toContain('Ordinary article.')
    expect(saved).not.toContain('_memnova_learning_')
    expect(saved).not.toContain('_memnova_page_id')
    await expect(page.getByRole('tab', { name: 'Review this note', exact: true })).toHaveCount(0)
    expect(fs.readFileSync(owner, 'utf8')).toBe(saved)
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

test('Home creates and verifies a backup after editing a managed note', async ({ page }) => {
  const root = createNoteMemoryFixture()
  const owner = path.join(root, 'project/alpha-project.md')
  const latest = new Date(Date.now() + 60_000)
  fs.utimesSync(owner, latest, latest)
  try {
    await openFixtureVault(page, root, { preserveLearningState: true })
    await page.getByRole('button', { name: /^All Notes/ }).click()
    await page.getByTestId('note-list-container').getByText('Alpha Project', { exact: true }).click()
    const properties = page.getByRole('button', { name: 'Open the properties panel', exact: true })
    if (await properties.isVisible()) await properties.click()
    await page.getByRole('switch', { name: 'Include in review schedule', exact: true }).click()
    await page.getByRole('button', { name: 'Add mnemonic', exact: true }).click()
    const editor = page.locator('.bn-editor [contenteditable=true]').first()
    const input = await editor.count() ? editor : page.locator('.bn-editor[contenteditable=true]').first()
    await input.click()
    await page.keyboard.insertText('A blue bookmark recalls the complete article.')
    await page.keyboard.press('Meta+s')
    await expect.poll(() => fs.readFileSync(owner, 'utf8')).toContain('A blue bookmark recalls the complete article.')
    await page.getByRole('button', { name: 'Back to note', exact: true }).click()
    const saved = fs.readFileSync(owner, 'utf8')
    await page.getByRole('button', { name: 'Home', exact: true }).click()
    await expect(page.locator('.bn-editor')).toHaveCount(0)
    await page.getByRole('button', { name: 'Advanced', exact: true }).click()
    const backup = page.getByRole('region', { name: 'Backup history', exact: true })
    const selection = backup.getByRole('combobox', { name: 'Backup history', exact: true })
    const previous = await selection.count() ? await selection.innerText() : ''
    await backup.getByRole('button', { name: 'Create backup', exact: true }).click()
    await expect(selection).not.toHaveText(previous)
    await expect(backup).not.toContainText('note-editor-persistence-unavailable')
    await backup.getByRole('button', { name: 'Verify backup', exact: true }).click()
    await expect(backup).toContainText('Backup verified')
    expect(fs.readFileSync(owner, 'utf8')).toBe(saved)
  } finally {
    await page.close()
    removeFixtureVaultCopy(root)
  }
})


test('saving an ordinary note keeps the note list and Command Palette usable', async ({ page }) => {
  const root = createNoteMemoryFixture()
  const owner = path.join(root, 'project/alpha-project.md')
  fs.writeFileSync(owner, '# Alpha Project\n\nOrdinary article.\n')
  const latest = new Date(Date.now() + 60_000)
  fs.utimesSync(owner, latest, latest)
  try {
    await openFixtureVault(page, root)
    await page.getByRole('button', { name: /^All Notes/ }).click()
    await page.getByTestId('note-list-container').getByText('Alpha Project', { exact: true }).click()
    await page.locator('.bn-editor [data-content-type="paragraph"]').last().click()
    await page.keyboard.press('End')
    await page.keyboard.insertText(' Saved ordinary text.')
    await page.keyboard.press('Meta+s')
    await expect.poll(() => fs.readFileSync(owner, 'utf8')).toContain('Saved ordinary text.')
    await openCommandPalette(page)
    await expect(page.locator('#tolaria-fatal-render-error')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('note-list-container').getByText('Alpha Project', { exact: true })).toBeVisible()
  } finally {
    removeFixtureVaultCopy(root)
  }
})
