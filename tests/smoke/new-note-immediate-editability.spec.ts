import fs from 'fs'
import path from 'path'
import { test, expect, type Page } from '@playwright/test'
import { expectRichEditorCaret } from '../helpers/editorCaret'
import {
  createFixtureVaultCopy,
  openFixtureVaultDesktopHarness,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'
import { triggerMenuCommand } from './testBridge'

let tempVaultDir: string

function slugifyTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function expectEditorFocused(page: Page): Promise<void> {
  await expect.poll(async () => page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null
    return Boolean(active?.isContentEditable || active?.closest('[contenteditable="true"]'))
  }), { timeout: 5_000 }).toBe(true)
}

async function createUntitledNote(page: Page): Promise<void> {
  await page.locator('body').click()
  await triggerMenuCommand(page, 'file-new-note')
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5_000 })
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toHaveAttribute('aria-label', /untitled-note-\d+(?:-\d+)?/i, {
    timeout: 5_000,
  })
  const titleBlock = page.locator('.bn-block-content[data-content-type="heading"]').first()
  await expect(titleBlock).toBeVisible({ timeout: 5_000 })
  await titleBlock.click()
  await expectEditorFocused(page)
}

async function openPropertiesPanel(page: Page): Promise<void> {
  const openPanelButton = page.getByRole('button', { name: 'Open the properties panel' })
  if (await openPanelButton.count()) {
    await openPanelButton.click()
  }
}

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000)
  tempVaultDir = createFixtureVaultCopy()
  await openFixtureVaultDesktopHarness(page, tempVaultDir)
})

test.afterEach(() => {
  removeFixtureVaultCopy(tempVaultDir)
})

test('the New Note command from Home opens a focused plain Markdown note', async ({ page }) => {
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await expect(page.locator('.app__dashboard')).toBeVisible()
  await triggerMenuCommand(page, 'file-new-note')
  await expect(page.locator('.bn-editor')).toBeVisible()
  await expectRichEditorCaret(page, 'heading')
  await page.keyboard.type('Ordinary journal')
  await expect(page.getByRole('heading', { name: 'Ordinary journal', level: 1 })).toBeVisible()
  await page.keyboard.press('Enter')
  await expectRichEditorCaret(page, 'paragraph')
  await page.keyboard.type('Ideas from the train.')
  const written = path.join(tempVaultDir, 'ordinary-journal.md')
  await expect.poll(() => fs.existsSync(written) ? fs.readFileSync(written, 'utf8') : '').toContain('Ideas from the train.')
  expect(fs.readFileSync(written, 'utf8')).not.toContain('_memnova_learning_enabled: true')
})

test('@smoke newly created notes stay editable before any reselection', async ({ page }) => {
  const title = `Immediate Editability ${Date.now()}`
  const bodyMarker = `body edit ${Date.now()}`
  const propertyValue = `Owner ${Date.now()}`
  const renamedStem = slugifyTitle(title)
  const notePath = path.join(tempVaultDir, `${renamedStem}.md`)

  await createUntitledNote(page)

  await page.keyboard.type(title, { delay: 10 })
  await page.keyboard.press('Enter')
  await page.keyboard.type(bodyMarker, { delay: 10 })

  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible({ timeout: 5_000 })
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toHaveAttribute('aria-label', 'Filename ' + (renamedStem) + '. Press Enter to rename', { timeout: 10_000 })
  await expect.poll(() => fs.existsSync(notePath), { timeout: 10_000 }).toBe(true)
  await expect.poll(() => fs.readFileSync(notePath, 'utf8'), { timeout: 10_000 }).toContain(bodyMarker)

  await openPropertiesPanel(page)
  await expect(page.getByTestId('add-property-row')).toBeVisible()
  await page.getByTestId('add-property-row').click()
  await expect(page.getByTestId('add-property-form')).toBeVisible()
  await page.getByPlaceholder('Property').fill('Owner')
  await page.getByPlaceholder('Value').fill(propertyValue)
  await page.getByTestId('add-property-confirm').click()

  const ownerRow = page.getByTestId('editable-property').filter({ hasText: 'Owner' })
  await expect(ownerRow).toContainText(propertyValue)
  await expect.poll(() => fs.readFileSync(notePath, 'utf8'), { timeout: 10_000 }).toContain(`Owner: ${JSON.stringify(propertyValue)}`)
})

test('@smoke untouched newly created notes can be renamed and updated before reselection', async ({ page }) => {
  const renamedStem = `fresh-note-${Date.now()}`
  const propertyValue = `Queued ${Date.now()}`
  const renamedPath = path.join(tempVaultDir, `${renamedStem}.md`)

  await createUntitledNote(page)

  await page.getByTestId('breadcrumb-filename-trigger').dblclick()
  const renameInput = page.getByTestId('breadcrumb-filename-input')
  await expect(renameInput).toBeVisible({ timeout: 5_000 })
  await renameInput.fill(renamedStem)
  await renameInput.press('Enter')

  await expect(page.getByTestId('breadcrumb-filename-trigger')).toHaveAttribute('aria-label', 'Filename ' + (renamedStem) + '. Press Enter to rename', { timeout: 10_000 })
  await expect.poll(() => fs.existsSync(renamedPath), { timeout: 10_000 }).toBe(true)

  await openPropertiesPanel(page)
  await page.getByTestId('add-property-row').click()
  await expect(page.getByTestId('add-property-form')).toBeVisible()
  await page.getByPlaceholder('Property').fill('Owner')
  await page.getByPlaceholder('Value').fill(propertyValue)
  await page.getByTestId('add-property-confirm').click()

  const ownerRow = page.getByTestId('editable-property').filter({ hasText: 'Owner' })
  await expect(ownerRow).toContainText(propertyValue)
  await expect.poll(() => fs.readFileSync(renamedPath, 'utf8'), { timeout: 10_000 }).toContain(`Owner: ${JSON.stringify(propertyValue)}`)
})
