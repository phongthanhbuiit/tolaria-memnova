import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test, expect, type Locator } from '@playwright/test'
import type { BlockNoteEditor } from '@blocknote/core'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { triggerMenuCommand } from '../smoke/testBridge'

type EditorSurface = HTMLElement & { editor: BlockNoteEditor['_tiptapEditor'] }

async function captureSelection(editor: Locator) {
  return editor.evaluate((element: EditorSurface) => element.editor.state.selection.toJSON() as { anchor: number; head: number })
}

test.use({ locale: 'en-US' })

test('switching the editor dictionary preserves its live draft, selection and undo history', async ({ page }) => {
  const vault = createFixtureVaultCopy()
  const note = path.join(vault, 'project/alpha-project.md')
  const original = readFileSync(note, 'utf8')
  const draft = ' Unwritten locale-switch draft.'
  try {
    // Keep the actual draft in memory across the locale change.
    await page.route('**/api/vault/save', route => route.fulfill({ status: 503 }))
    await openFixtureVault(page, vault)
    await page.getByTestId('note-list-container').getByText('Alpha Project', { exact: true }).click()

    const editor = page.locator('.bn-editor[contenteditable="true"]')
    const paragraph = editor.locator('[data-content-type="paragraph"]').first()
    await paragraph.hover()
    await expect(page.getByRole('button', { name: 'Add block', exact: true })).toBeVisible()
    await paragraph.click()
    await page.keyboard.press('End')
    await page.keyboard.insertText(draft)
    await expect(paragraph).toContainText(draft)
    await page.keyboard.press('Shift+ArrowLeft')
    await page.keyboard.press('Shift+ArrowLeft')
    await expect.poll(async () => {
      const selection = await captureSelection(editor)
      return selection.anchor !== selection.head
    }).toBe(true)
    const before = await captureSelection(editor)
    const node = await editor.elementHandle()

    await triggerMenuCommand(page, 'view-command-palette')
    await page.getByPlaceholder('Type a command...').fill('Switch Language to Vietnamese')
    await page.getByRole('button', { name: 'Switch Language to Vietnamese', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Mở cài đặt', exact: true })).toBeVisible()
    await expect(editor).toContainText(draft)
    expect(await captureSelection(editor)).toEqual(before)
    expect(await editor.evaluate((element, previous) => element === previous, node)).toBe(true)
    expect(readFileSync(note, 'utf8')).toBe(original)

    await paragraph.hover()
    await expect(page.getByRole('button', { name: 'Thêm khối', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mở trình đơn khối', exact: true })).toBeVisible()
    await editor.focus()
    await page.keyboard.press('ControlOrMeta+z')
    await expect(editor).not.toContainText(draft)
    await expect(editor.getByRole('heading', { name: 'Alpha Project', level: 1 })).toBeVisible()
    await page.keyboard.press('ControlOrMeta+Shift+z')
    await expect(editor).toContainText(draft)

    await editor.evaluate((element: EditorSurface) => element.editor.commands.focus('end'))
    await expect(editor).toBeFocused()
    await page.keyboard.press('Enter')
    const hint = editor.locator('[data-content-type="paragraph"][data-is-empty-and-focused] .bn-inline-content')
    await expect(hint).toHaveCount(1)
    const placeholder = () => hint.evaluate(element => getComputedStyle(element, '::before').content)
    await expect.poll(placeholder).toBe('"Nhập văn bản hoặc gõ \'/\' để thêm định dạng"')

    await triggerMenuCommand(page, 'view-command-palette')
    await page.getByPlaceholder('Nhập một lệnh...').fill('Chuyển ngôn ngữ sang Tiếng Indonesia')
    await page.getByRole('button', { name: 'Chuyển ngôn ngữ sang Tiếng Indonesia', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Buka pengaturan', exact: true })).toBeVisible()
    await expect.poll(placeholder).toBe('"Enter text or type \'/\' for commands"')
    await paragraph.hover()
    await expect(page.getByRole('button', { name: 'Add block', exact: true })).toBeVisible()
    await expect(editor).toContainText(draft)
  } finally {
    await page.close()
    removeFixtureVaultCopy(vault)
  }
})
