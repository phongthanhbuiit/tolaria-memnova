import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { createNoteMemoryFixture } from '../helpers/noteMemoryFixture'
import { openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { executeCommand, openCommandPalette } from '../smoke/helpers'

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
async function openNote(page: Page, title: string) {
  await page.getByTestId('note-list-container').getByText(title, { exact: true }).click()
  await expect(page.locator('.bn-editor')).toBeVisible()
}
async function undoAndSave(page: Page) {
  await page.locator('.bn-editor').click()
  await page.keyboard.press(`${modifier}+z`)
  await page.keyboard.press(`${modifier}+s`)
}

async function addRawMnemonic(page: Page, owner: string) {
  await openCommandPalette(page); await executeCommand(page, 'Toggle Raw')
  const raw = page.getByTestId('raw-editor-codemirror').locator('.cm-content')
  await expect(raw).toBeVisible()
  await raw.click(); await page.keyboard.press(`${modifier}+End`)
  await page.keyboard.insertText('\nRaw mnemonic addition.')
  await page.keyboard.press(`${modifier}+s`)
  await expect.poll(() => fs.readFileSync(owner, 'utf8')).toContain('Raw mnemonic addition.')
  await openCommandPalette(page); await executeCommand(page, 'Toggle Raw')
}

test('loading and switching notes never lets Undo save the previous document', async ({ page }) => {
  const root = createNoteMemoryFixture()
  const owner = path.join(root, 'project/alpha-project.md')
  const other = path.join(root, 'memory-fixtures/beta.md')
  fs.writeFileSync(owner, '# Alpha Project\n\nOriginal alpha article.\n')
  fs.writeFileSync(other, '# Beta Article\n\nIndependent beta article.\n')
  try {
    await openFixtureVault(page, root, { preserveLearningState: true })
    await page.getByRole('button', { name: /^All Notes/ }).click()
    await openNote(page, 'Alpha Project')
    await expect(page.locator('.bn-editor')).toContainText('Original alpha article.')
    await undoAndSave(page)
    await expect(page.locator('.bn-editor')).toContainText('Original alpha article.')
    await page.locator('.bn-editor [data-content-type="paragraph"]').first().click()
    await page.keyboard.press('End')
    await page.keyboard.insertText(' Alpha user edit.')
    await page.keyboard.press(`${modifier}+s`)
    await expect.poll(() => fs.readFileSync(owner, 'utf8')).toContain('Alpha user edit.')
    const savedAlpha = fs.readFileSync(owner, 'utf8')
    await openNote(page, 'Beta Article')
    await expect(page.locator('.bn-editor')).toContainText('Independent beta article.')
    await undoAndSave(page)
    await expect(page.locator('.bn-editor')).toContainText('Independent beta article.')
    expect(fs.readFileSync(other, 'utf8')).toContain('Independent beta article.')
    expect(fs.readFileSync(other, 'utf8')).not.toContain('alpha')
    await page.getByRole('button', { name: 'Go Back', exact: true }).click()
    await expect(page.locator('.bn-editor')).toContainText('Alpha user edit.')
    await undoAndSave(page)
    await expect(page.locator('.bn-editor')).toContainText('Alpha user edit.')
    expect(fs.readFileSync(owner, 'utf8')).toBe(savedAlpha)
  } finally { await page.close(); removeFixtureVaultCopy(root) }
})

test('face switches and raw exit isolate history while same-face edits remain reversible', async ({ page }) => {
  const root = createNoteMemoryFixture()
  const owner = path.join(root, 'project/alpha-project.md')
  const source = path.join(root, 'memory-fixtures/source.md')
  const originalSource = fs.readFileSync(source)
  fs.writeFileSync(owner, `---\ncustom: {big: 9007199254740993, keep: [false]}\n---\n# Alpha Project\n\nArticle front.\n\n<!-- FLASHCARD:BACK -->\n\nMnemonic back.\n`)
  try {
    await openFixtureVault(page, root, { preserveLearningState: true })
    await page.getByRole('button', { name: /^All Notes/ }).click()
    await openNote(page, 'Alpha Project')
    await page.getByRole('tab', { name: 'Memorization', exact: true }).click()
    await page.getByRole('button', { name: 'Enable memorization', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Pause memorization', exact: true })).toBeEnabled()
    await page.getByRole('tab', { name: 'Content', exact: true }).click()
    await expect(page.locator('.bn-editor')).toContainText('Article front.')
    await page.locator('.bn-editor [data-content-type="paragraph"]').first().click()
    await page.keyboard.press('End')
    await page.keyboard.insertText(' Front edit.')
    await expect(page.locator('.bn-editor')).toContainText('Front edit.')
    await page.keyboard.press(`${modifier}+z`)
    await expect(page.locator('.bn-editor')).not.toContainText('Front edit.')
    await page.keyboard.press(`${modifier}+Shift+z`)
    await expect(page.locator('.bn-editor')).toContainText('Front edit.')
    await page.getByRole('tab', { name: 'Mnemonic', exact: true }).click()
    await expect(page.locator('.bn-editor')).toContainText('Mnemonic back.')
    await undoAndSave(page)
    await expect(page.locator('.bn-editor')).toContainText('Mnemonic back.')
    await expect(page.locator('.bn-editor')).not.toContainText('Article front.')
    await page.getByRole('tab', { name: 'Article', exact: true }).click()
    await expect(page.locator('.bn-editor')).toContainText('Front edit.')
    await undoAndSave(page)
    await expect(page.locator('.bn-editor')).toContainText('Front edit.')
    await addRawMnemonic(page, owner)
    await expect(page.locator('.bn-editor')).toContainText('Front edit.')
    await undoAndSave(page)
    await page.getByRole('tab', { name: 'Mnemonic', exact: true }).click()
    await expect(page.locator('.bn-editor')).toContainText('Raw mnemonic addition.')
    await expect.poll(() => fs.readFileSync(owner, 'utf8')).toContain('Raw mnemonic addition.')
    const saved = fs.readFileSync(owner, 'utf8')
    expect(saved).toContain('Article front.')
    expect(saved).toContain('Mnemonic back.')
    expect(saved).toContain('9007199254740993')
    expect(fs.readFileSync(source)).toEqual(originalSource)
    await page.reload()
    await page.getByRole('button', { name: /^All Notes/ }).click()
    await openNote(page, 'Alpha Project')
    await expect(page.locator('.bn-editor')).toContainText('Front edit.')
    await page.getByRole('tab', { name: 'Mnemonic', exact: true }).click()
    await expect(page.locator('.bn-editor')).toContainText('Raw mnemonic addition.')
    expect(fs.readFileSync(owner, 'utf8')).toBe(saved)
  } finally { await page.close(); removeFixtureVaultCopy(root) }
})
