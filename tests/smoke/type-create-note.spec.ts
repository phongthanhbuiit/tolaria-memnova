import { test, expect } from '@playwright/test'
import { executeCommand, openCommandPalette } from './helpers'
import { createFixtureVaultCopy, openFixtureVaultDesktopHarness, removeFixtureVaultCopy } from '../helpers/fixtureVault'

let tempVaultDir: string

test.beforeEach(async ({ page }) => {
  tempVaultDir = createFixtureVaultCopy()
  await openFixtureVaultDesktopHarness(page, tempVaultDir)
})

test.afterEach(() => {
  removeFixtureVaultCopy(tempVaultDir)
})

test('clicking + in type section creates note with that type', async ({ page }) => {
  // Click on "Projects" in the sidebar to select that type section
  const projectsItem = page.locator('[data-testid="sidebar-section-Projects"]').or(page.locator('.app__sidebar').locator('text=Projects').first())
  await projectsItem.click()

  // Click the "+" button to create a new note
  await page.click('[title="Create new note"]')
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5000 })

  // The new note should use a type-specific untitled filename.
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toHaveAttribute('aria-label', /untitled-project-\d+/i)

  // Toggle raw editor to see frontmatter
  await openCommandPalette(page)
  await executeCommand(page, 'Toggle Raw')
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 5000 })

  const rawEditor = page.locator('.cm-content')
  const content = await rawEditor.textContent()
  expect(content).toContain('type: Project')
})

test('clicking + in All Notes creates generic note', async ({ page }) => {
  // Click on "All Notes" in sidebar
  await page.locator('text=All Notes').first().click()

  // Click the "+" button
  await page.click('[title="Create new note"]')
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5000 })

  // The new note should be a generic untitled note, not a typed one.
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toHaveAttribute('aria-label', /untitled-note-\d+/i)
  await expect(page.getByTestId('breadcrumb-filename-trigger')).not.toHaveAttribute('aria-label', /untitled-project-\d+/i)
})
