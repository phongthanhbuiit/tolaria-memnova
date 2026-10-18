import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import {
  createFixtureVaultCopy,
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'

// Real browser editor/file adapter; native pending/history guards have separate IPC tests.
test('delete confirmation explains both faces and flushes before closing the note', async ({
  page,
}) => {
  const root = createFixtureVaultCopy()
  const owner = path.join(root, 'note/note-b.md')
  const target = path.join(root, 'note/note-c.md')
  const source =
    '---\nIs A: Note\nStatus: Active\n_memnova_page_id: 11111111-1111-4111-8111-111111111111\n_memnova_learning_version: 1\n_memnova_learning_enabled: false\n_memnova_back_kind: inline\n---\n# Note B\n\nArticle\n<!-- FLASHCARD:BACK -->\nRetained mnemonic\n'
  try {
    fs.writeFileSync(owner, source)
    const targetBefore = fs.readFileSync(target, 'utf8')
    await openFixtureVault(page, root)
    await page.getByText('Note B', { exact: true }).first().click()
    await page.getByRole('tab', { name: 'Mnemonic', exact: true }).click()
    const editor = page.locator('.bn-editor:visible')
    await expect(editor).toContainText('Retained mnemonic')
    await editor.locator('[data-content-type="paragraph"]').last().click()
    await page.keyboard.press('End')
    await page.keyboard.insertText(' Last mnemonic edit')
    await page
      .getByRole('button', { name: 'More note actions', exact: true })
      .click()
    await page
      .getByRole('menuitem', { name: 'Delete this note', exact: true })
      .click()
    const dialog = page.getByTestId('confirm-delete-dialog')
    await expect(dialog).toContainText('inline mnemonics')
    await expect(dialog).toContainText('Linked source notes')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(editor).toContainText('Last mnemonic edit')
    await page
      .getByRole('button', { name: 'More note actions', exact: true })
      .click()
    await page
      .getByRole('menuitem', { name: 'Delete this note', exact: true })
      .click()
    await page.getByTestId('confirm-delete-btn').click()
    // The browser delete handler removes the UI record only. Assert the saved
    // bytes before unmount; actual filesystem deletion is covered by native tests.
    await expect(
      page.getByText('Note permanently deleted', { exact: true })
    ).toBeVisible()
    await expect
      .poll(() => fs.readFileSync(owner, 'utf8'))
      .toContain('Last mnemonic edit')
    expect(fs.readFileSync(owner, 'utf8')).toContain('Article')
    await expect(page.locator('.bn-editor:visible')).toHaveCount(0)
    expect(fs.readFileSync(target, 'utf8')).toBe(targetBefore)
  } finally {
    removeFixtureVaultCopy(root)
  }
})
