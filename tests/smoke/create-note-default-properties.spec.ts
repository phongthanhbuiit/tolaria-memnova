import { test, expect } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { executeCommand, openCommandPalette, sendShortcut } from './helpers'

test('keyboard-created notes omit default status metadata @smoke', async ({ page }) => {
  const vault = createFixtureVaultCopy()
  try {
    await openFixtureVault(page, vault)

    await sendShortcut(page, 'n', ['Control'])
    await expect(page.getByTestId('breadcrumb-filename-trigger')).toHaveAttribute('aria-label', /untitled-note-\d+/i, { timeout: 5_000 })

    await openCommandPalette(page)
    await executeCommand(page, 'Toggle Raw')

    const rawEditor = page.locator('.cm-content')
    await expect(rawEditor).toContainText('type: Note')
    await expect(rawEditor).not.toContainText('status:')
  } finally {
    removeFixtureVaultCopy(vault)
  }
})
