import fs from 'fs'
import path from 'path'
import { test, expect } from '@playwright/test'
import {
  createFixtureVaultCopy,
  openFixtureVaultDesktopHarness,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'
import { dispatchShortcutEvent } from './testBridge'

let tempVaultDir: string

test.beforeEach(() => {
  tempVaultDir = createFixtureVaultCopy()
})

test.afterEach(() => {
  removeFixtureVaultCopy(tempVaultDir)
})

async function openNoteWithCmdO(page: import('@playwright/test').Page): Promise<void> {
  await dispatchShortcutEvent(page, {
    key: 'o',
    code: 'KeyO',
    ctrlKey: false,
    metaKey: true,
    shiftKey: false,
    altKey: false,
    bubbles: true,
    cancelable: true,
  })
  await expect(page.getByTestId('quick-open-palette')).toBeVisible({ timeout: 5_000 })
}

test('quick open creates a note when the typed title has no matches @smoke', async ({ page }) => {
  const title = 'New Research Brief'
  const notePath = path.join(tempVaultDir, 'new-research-brief.md')

  await openFixtureVaultDesktopHarness(page, tempVaultDir)
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await openNoteWithCmdO(page)
  await page.locator('input[placeholder="Search notes..."]').fill(title)

  await expect(page.getByRole('button', { name: `Create note "${title}"` })).toBeVisible()
  await page.keyboard.press('Enter')

  await expect(page.getByTestId('quick-open-palette')).not.toBeVisible({ timeout: 5_000 })
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('new-research-brief', { timeout: 5_000 })
  await expect.poll(() => fs.existsSync(notePath), { timeout: 5_000 }).toBe(true)
  const content = fs.readFileSync(notePath, 'utf8')
  expect(content).toContain(`title: ${title}`)
  expect(content).toContain('type: Note')
})

test('quick open returns from Home to an existing note even if it was the last open note', async ({ page }) => {
  await openFixtureVaultDesktopHarness(page, tempVaultDir)
  await page.getByTestId('note-list-container').getByText('Alpha Project', { exact: true }).click()
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('alpha-project')
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await openNoteWithCmdO(page)
  await page.getByTestId('quick-open-palette').getByRole('textbox').fill('Alpha Project')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('alpha-project')
})
