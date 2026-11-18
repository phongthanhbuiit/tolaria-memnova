import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVaultDesktopHarness, removeFixtureVaultCopy } from '../helpers/fixtureVault'

for (const [shortcut, placeholder] of [
  ['Meta+p', 'Search notes...'],
  ['Meta+k', 'Type a command...'],
] as const) {
  test(`${shortcut} routes immediate typing away from the active note @smoke`, async ({ page }) => {
    const vault = createFixtureVaultCopy()
    try {
      const note = path.join(vault, 'project', 'alpha-project.md')
      const original = fs.readFileSync(note, 'utf8')
      await openFixtureVaultDesktopHarness(page, vault)
      await page.getByTestId('note-list-container').getByText('Alpha Project', { exact: true }).click()
      const editor = page.locator('.bn-editor[contenteditable="true"], .bn-editor [contenteditable="true"]').first()
      await editor.click()
      const originalEditorText = await editor.innerText()

      await page.keyboard.press(shortcut)
      await page.keyboard.press('x')

      await expect(editor).toHaveText(originalEditorText, { useInnerText: true })
      await expect(page.getByPlaceholder(placeholder)).toHaveValue('x')
      await page.keyboard.press('Escape')
      expect(fs.readFileSync(note, 'utf8')).toBe(original)
    } finally {
      removeFixtureVaultCopy(vault)
    }
  })
}
