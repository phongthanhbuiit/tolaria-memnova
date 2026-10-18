import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import {
  createFixtureVaultCopy,
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'

// Browser text model; native source/journal/schedule preservation has real SQLite tests.
test('page properties keep both faces and opaque YAML through the next mnemonic save', async ({
  page,
}) => {
  const root = createFixtureVaultCopy(),
    note = path.join(root, 'note/note-b.md')
  const opaque =
    'opaque: &value {huge: 9007199254740993, empty: null}\ncopy: *value\n'
  const source = [
    '---',
    'Is A: Note',
    'Status: Active',
    '_memnova_page_id: 11111111-1111-4111-8111-111111111111',
    '_memnova_learning_version: 1',
    '_memnova_learning_enabled: false',
    '_memnova_back_kind: inline',
    'zero: 0',
    opaque.trimEnd(),
    '---',
    '# Note B',
    '',
    'Article remains',
    '<!-- FLASHCARD:BACK -->',
    'Mnemonic remains',
    '',
  ].join('\n')
  try {
    fs.writeFileSync(note, source)
    await openFixtureVault(page, root)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.getByText('Note B', { exact: true }).first().click()
    await page
      .getByRole('button', { name: 'Open the properties panel', exact: true })
      .click()
    await expect(
      page.getByRole('region', { name: 'Review schedule · read only' })
    ).toContainText('This note has no review schedule yet.')
    await expect(
      page.getByTestId('editable-property').filter({ hasText: 'Opaque' })
    ).toHaveCount(0)
    await expect(
      page.getByTestId('editable-property').filter({ hasText: 'Copy' })
    ).toHaveCount(0)
    await page
      .getByRole('button', { name: 'Page properties', exact: true })
      .click()
    const dialog = page.getByRole('dialog', {
      name: 'Page properties',
      exact: true,
    })
    await dialog.getByRole('textbox', { name: 'zero', exact: true }).fill('2')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect
      .poll(() => fs.readFileSync(note, 'utf8'))
      .toBe(source.replace('zero: 0', 'zero: 2'))
    await page
      .getByRole('button', { name: 'Switch to wide note width', exact: true })
      .click()
    await expect
      .poll(() => fs.readFileSync(note, 'utf8'))
      .toContain('_width: "wide"')
    await page.getByRole('tab', { name: 'Mnemonic', exact: true }).click()
    const editor = page.locator('.bn-editor:visible')
    await expect(editor).toContainText('Mnemonic remains')
    await editor.locator('[data-content-type="paragraph"]').last().click()
    await page.keyboard.press('End')
    await page.keyboard.insertText(' After property change')
    await page.keyboard.press('Meta+s')
    await expect
      .poll(() => fs.readFileSync(note, 'utf8'))
      .toContain('After property change')
    const saved = fs.readFileSync(note, 'utf8')
    expect(saved).toContain('zero: 2\n')
    expect(saved).toContain('_width: "wide"')
    expect(saved).toContain(opaque)
    expect(saved).toContain('Article remains')
    expect(saved.split('<!-- FLASHCARD:BACK -->')).toHaveLength(2)
    await page
      .getByRole('region', { name: 'Review schedule · read only' })
      .scrollIntoViewIfNeeded()
    await page.screenshot({ path: '/tmp/memnova-m18-properties.png' })
  } finally {
    removeFixtureVaultCopy(root)
  }
})
