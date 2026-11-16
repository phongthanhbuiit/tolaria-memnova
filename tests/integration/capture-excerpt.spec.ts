import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVaultTauri, removeFixtureVaultCopy } from '../helpers/fixtureVault'

let root: string
const files = () => readdirSync(root).filter(name => name.startsWith('excerpt-') && name.endsWith('.md'))
const action = 'Save excerpt with source'

test.beforeEach(async ({ page }) => {
  root = createFixtureVaultCopy()
  await openFixtureVaultTauri(page, root)
  await page.getByTestId('note-list-container').getByText('Note B', { exact: true }).click()
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('note-b')
})
test.afterEach(() => removeFixtureVaultCopy(root))

async function openFromPalette(page: Page) {
  await page.keyboard.press('Meta+k')
  await page.getByPlaceholder(/type a command/i).fill(action)
  await page.keyboard.press('Enter')
  return page.getByRole('dialog', { name: action })
}

test('capture from the palette validates the URL, cancels cleanly, and creates exactly one ordinary note', async ({ page }) => {
  const sourcePath = join(root, 'note/note-b.md')
  const original = readFileSync(sourcePath, 'utf8')
  let dialog = await openFromPalette(page)
  await dialog.getByLabel('Excerpt', { exact: true }).fill('A short observation')
  await dialog.getByLabel('Source URL').fill('javascript:alert(1)')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog.getByLabel('Source URL')).toBeFocused()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  expect(files()).toHaveLength(0)
  dialog = await openFromPalette(page)
  await dialog.getByLabel('Excerpt', { exact: true }).fill('A short observation')
  await dialog.getByLabel('Source URL').fill('https://example.org/reading')
  await dialog.getByRole('button', { name: 'Save', exact: true }).evaluate(button => {
    const form = button.closest('form')!
    form.requestSubmit()
    form.requestSubmit()
  })
  await expect(dialog).toBeHidden()
  await expect.poll(files).toHaveLength(1)
  const content = readFileSync(join(root, files()[0]), 'utf8')
  expect(content).toContain('> A short observation')
  expect(content).toContain('https://example.org/reading')
  expect(content.split('---')[1].trim()).toBe('type: Note')
  expect(readFileSync(sourcePath, 'utf8')).toBe(original)
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('note-b')
})

test('save a selection from the formatting toolbar without modifying or leaving its source', async ({ page }) => {
  const sourcePath = join(root, 'note/note-b.md')
  const original = readFileSync(sourcePath, 'utf8')
  const passage = page.locator('.bn-editor [data-content-type="paragraph"]').filter({ hasText: 'referenced by Alpha Project' })
  await passage.click({ clickCount: 3 })
  const sourceSelection = await page.evaluate(() => window.getSelection()?.toString())
  await page.getByRole('button', { name: action, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: action })
  const selectedText = await dialog.getByLabel('Excerpt', { exact: true }).inputValue()
  expect(selectedText.trim()).toBe(sourceSelection?.trim())
  expect(selectedText).toContain('referenced by Alpha Project')
  await expect(dialog.getByText('Source note: Note B')).toBeVisible()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect.poll(files).toHaveLength(1)
  const saved = readFileSync(join(root, files()[0]), 'utf8')
  expect(saved).toContain('[[note/note-b]]')
  expect(saved).toContain('referenced by Alpha Project')
  expect(readFileSync(sourcePath, 'utf8')).toBe(original)
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('note-b')
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe(sourceSelection)
  await page.getByRole('button', { name: 'Open note', exact: true }).click()
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText(files()[0].replace(/\.md$/, ''))
  await page.locator('.bn-editor .wikilink[data-target="note/note-b"]').click({ modifiers: ['Meta'] })
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('note-b')
})

for (const legacy of [false, true]) {
  test(`a ${legacy ? 'previously saved' : 'new'} excerpt returns to its exact source after editing around duplicate filenames with wiki delimiters`, async ({ page }) => {
    const filename = 'C# [map] | 100%.md'
    const sourceText = 'Only the original contains this full sentence.'
    const source = join(root, 'note', filename)
    const original = `---\ntype: Note\n---\n\n# Original reference\n\n${sourceText}\n`
    writeFileSync(source, original)
    writeFileSync(join(root, filename), '---\ntype: Note\n---\n\n# Different reference\n\nWrong note.\n')
    if (legacy) {
      const href = 'note/C%23%20%5Bmap%5D%20%7C%20100%25.md'
      writeFileSync(join(root, 'excerpt-old.md'), `---\ntype: Note\n---\n\n# Old excerpt\n\n> Some words\n\n[Original reference](<${href}>)\n`)
    }
    await page.reload()
    if (legacy) {
      await page.getByTestId('note-list-container').getByText('Old excerpt', { exact: true }).click()
    } else {
      await page.getByTestId('note-list-container').getByText('Original reference', { exact: true }).click()
      await page.locator('.bn-editor').getByText(sourceText, { exact: true }).click({ clickCount: 3 })
      await page.getByRole('button', { name: action, exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click()
      await page.getByRole('button', { name: 'Open note', exact: true }).click()
    }
    const link = page.locator('.bn-editor').getByRole('link', { name: 'Original reference' })
    await expect(link).toBeVisible()
    await page.locator('.bn-editor blockquote').click()
    await page.keyboard.press('End')
    await page.keyboard.type(' Edited.')
    await page.keyboard.press('Meta+s')
    const captured = join(root, files()[0])
    await expect.poll(() => readFileSync(captured, 'utf8')).toContain('Edited.')
    expect(readFileSync(captured, 'utf8')).toContain('note/C%23%20%5Bmap%5D%20%7C%20100%25.md')
    await link.click({ modifiers: ['Meta'] })
    await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('C# [map] | 100%')
    await expect(page.locator('.bn-editor').getByText('Original reference', { exact: true })).toBeVisible()
    expect(readFileSync(source, 'utf8')).toBe(original)
  })
}
