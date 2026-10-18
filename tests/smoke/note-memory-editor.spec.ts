import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { executeCommand, openCommandPalette } from './helpers'

// Browser learning model + real fixture filesystem; native acceptance is recorded separately.
test('note memory edits both faces and raw mode through one complete saved document', async ({ page }) => {
  test.setTimeout(60_000)
  const root = createFixtureVaultCopy(), note = path.join(root, 'note/note-b.md')
  const header = '---\nIs A: Note\nStatus: Active\n_memnova_page_id: 11111111-1111-4111-8111-111111111111\n_memnova_learning_version: 1\n_memnova_learning_enabled: false\n_memnova_back_kind: inline\ncustom: 9007199254740999\n---\n'
  try {
    fs.writeFileSync(note, `${header}# Note B\n\nArticle-only text\n<!-- FLASHCARD:BACK -->\nMnemonic-only text\n`)
    await openFixtureVault(page, root)
    await page.getByText('Note B', { exact: true }).first().click()
    const editor = page.locator('.bn-editor')
    await expect(page.getByRole('tab', { name: 'Article', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(editor).toContainText('Article-only text')
    await expect(editor).not.toContainText('Mnemonic-only text')
    await editor.locator('[data-content-type="paragraph"]').last().click()
    await page.keyboard.press('End')
    await page.keyboard.insertText(' Last article stroke')
    await page.getByRole('tab', { name: 'Mnemonic', exact: true }).click()
    await expect(editor).toContainText('Mnemonic-only text')
    await expect(editor).not.toContainText('Article-only text')
    await editor.locator('[data-content-type="paragraph"]').last().click()
    await page.keyboard.press('End')
    await page.keyboard.insertText(' Last mnemonic stroke')
    await page.getByRole('tab', { name: 'Article', exact: true }).click()
    await expect(editor).toContainText('Last article stroke')
    await expect(editor).toBeVisible()
    await page.screenshot({ path: '/tmp/memnova-m15-editor-article.png' })
    await page.keyboard.press('Meta+s')
    await expect.poll(() => fs.readFileSync(note, 'utf8')).toContain('Last mnemonic stroke')
    await openCommandPalette(page)
    await executeCommand(page, 'Toggle Raw')
    const raw = page.locator('.cm-content')
    await expect(raw).toContainText('Last article stroke')
    await expect(raw).toContainText('Last mnemonic stroke')
    await expect(raw).toContainText('<!-- FLASHCARD:BACK -->')
    expect(fs.readFileSync(note, 'utf8').startsWith(header)).toBe(true)
    expect(fs.readFileSync(note, 'utf8').match(/<!-- FLASHCARD:BACK -->/g)).toHaveLength(1)
    await page.screenshot({ path: '/tmp/memnova-m15-editor-raw.png' })
  } finally { removeFixtureVaultCopy(root) }
})
