import { test, expect, type Page } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { sendShortcut } from './helpers'

function releaseChannel(page: Page) {
  return page.getByTestId('settings-panel').getByRole('combobox', {
    name: 'Release channel',
    exact: true,
  })
}

test.describe('Release channel settings', () => {
  test.use({ locale: 'en-US' })
  let vault: string

  test.beforeEach(async ({ page }) => {
    vault = createFixtureVaultCopy()
    await openFixtureVault(page, vault)
    await expect(page.getByRole('button', { name: 'Open settings', exact: true })).toBeVisible()
  })

  test.afterEach(() => {
    removeFixtureVaultCopy(vault)
  })

  test('Settings panel defaults the release channel to Stable', async ({ page }) => {
    await sendShortcut(page, ',', ['Control'])
    const trigger = releaseChannel(page)
    await expect(trigger).toBeVisible()
    await expect(trigger).toHaveAttribute('data-value', 'stable')

    await trigger.click()
    await expect(page.getByRole('option', { name: 'Stable', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Alpha', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Beta' })).toHaveCount(0)
  })

  test('Release channel can be changed to alpha and saved', async ({ page }) => {
    await sendShortcut(page, 'k', ['Control'])
    const palette = page.locator('[data-command-palette="true"]')
    const commandLabel = 'Open Settings'
    await palette.getByRole('textbox').fill(commandLabel)
    await palette.getByRole('button').filter({ has: page.getByText(commandLabel, { exact: true }) }).click()

    const trigger = releaseChannel(page)
    await expect(trigger).toBeVisible()
    await trigger.click()
    await page.getByRole('option', { name: 'Alpha', exact: true }).click()
    await expect(trigger).toHaveAttribute('data-value', 'alpha')

    const panel = page.getByTestId('settings-panel')
    await panel.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(panel).toBeHidden()

    await sendShortcut(page, ',', ['Control'])
    await expect(trigger).toHaveAttribute('data-value', 'alpha')
  })
})
