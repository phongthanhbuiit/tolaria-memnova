import fs from 'node:fs'
import path from 'node:path'
import {
  createFixtureVaultCopy,
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'
import { test, expect, type Page, type Locator } from '@playwright/test'
test.setTimeout(120_000)
async function openLesson(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('tolaria:ai-agents-onboarding-dismissed', '1')
    localStorage.setItem('tolaria:claude-code-onboarding-dismissed', '1')
  })
  await page.goto('/')
  const later = page.getByRole('button', { name: 'Set up later', exact: true })
  await later
    .or(page.getByRole('button', { name: 'Home', exact: true }))
    .first()
    .waitFor({ state: 'visible' })
  if (await later.isVisible()) await later.click()
  await page
    .getByRole('listbox', { name: 'Notes', exact: true })
    .getByText('Build Laputa App', { exact: true })
    .click()
  await page.getByRole('tab', { name: 'Flashcards', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Add card', exact: true }),
  ).toBeEnabled()
}
async function addProperty(
  page: Page,
  dialog: Locator,
  name: string,
  kind: string,
) {
  await dialog
    .getByRole('button', { name: 'Add property', exact: true })
    .click()
  await dialog
    .getByRole('textbox', { name: 'Property name', exact: true })
    .fill(name)
  await dialog
    .getByRole('combobox', { name: 'Property type', exact: true })
    .click()
  await page.getByRole('option', { name: kind, exact: true }).click()
  await dialog
    .getByRole('button', { name: 'Add property', exact: true })
    .click()
}
test('linked answers and typed card drafts survive preview, save, reload, study and Undo', async ({
  page,
}, testInfo) => {
  await openLesson(page)
  await page.getByRole('button', { name: 'Add card', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Add card', exact: true })
  await form
    .getByLabel('Question', { exact: true })
    .fill('Explain the newsletter source')
  await form.getByRole('combobox', { name: 'Answer type' }).click()
  await page.getByRole('option', { name: 'Choose another page' }).click()
  await form.getByLabel('Answer page', { exact: true }).fill('Grow')
  await form
    .getByRole('button', { name: /Grow Newsletter.*grow-newsletter.md/ })
    .click()
  await form
    .getByRole('button', { name: 'Grow Newsletter', exact: true })
    .click()
  const preview = page.getByRole('dialog', {
    name: 'Grow Newsletter',
    exact: true,
  })
  await expect(preview).toBeVisible()
  await preview.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(
    form.getByRole('textbox', { name: 'Question', exact: true }),
  ).toHaveValue('Explain the newsletter source')
  await addProperty(page, form, 'priority', 'Number')
  await expect(
    form.getByRole('textbox', { name: 'priority', exact: true }),
  ).toHaveValue('0')
  await addProperty(page, form, 'remembered', 'Boolean')
  await expect(
    form.getByRole('switch', { name: 'remembered' }),
  ).not.toBeChecked()
  await addProperty(page, form, 'deadline', 'Date')
  await form.getByRole('button', { name: 'deadline', exact: true }).click()
  await expect(page.getByRole('grid')).toBeVisible()
  await page.keyboard.press('Escape')
  await addProperty(page, form, 'secret', 'Text')
  await form
    .getByRole('textbox', { name: 'secret', exact: true })
    .fill('Custom metadata stays private')
  await form.getByRole('combobox', { name: 'Status', exact: true }).click()
  await page.getByRole('option', { name: 'Active', exact: true }).click()
  await page.setViewportSize({ width: 480, height: 800 })
  const save = form.getByRole('button', { name: 'Save', exact: true })
  const box = await save.boundingBox()
  expect(box!.y + box!.height).toBeLessThanOrEqual(800)
  await page.screenshot({ path: testInfo.outputPath('typed-card-compact.png') })
  await save.click()
  await expect(form).toBeHidden()
  await page.reload()
  await openLesson(page)
  await page
    .getByRole('button', { name: 'Explain the newsletter source', exact: true })
    .click()
  const saved = page.getByRole('dialog', { name: 'Edit card', exact: true })
  await expect(
    saved.getByRole('textbox', { name: 'priority', exact: true }),
  ).toHaveValue('0')
  await expect(
    saved.getByRole('switch', { name: 'remembered' }),
  ).not.toBeChecked()
  await expect(
    saved.getByRole('textbox', { name: 'secret', exact: true }),
  ).toHaveValue('Custom metadata stays private')
  await saved.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page
    .getByRole('tabpanel', { name: 'Flashcards', exact: true })
    .getByRole('button', { name: 'Study', exact: true })
    .click()
  const study = page.getByRole('dialog')
  await expect(
    study.getByText('Custom metadata stays private', { exact: true }),
  ).toHaveCount(0)
  await expect(
    study.getByRole('button', { name: 'Grow Newsletter', exact: true }),
  ).toHaveCount(0)
  await study.getByRole('button', { name: 'Show answer', exact: true }).click()
  await expect(
    study.getByRole('button', { name: 'Grow Newsletter', exact: true }),
  ).toBeVisible()
  await study.getByRole('button', { name: /^Good/ }).click()
  await study.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(
    study.getByText('Explain the newsletter source', { exact: true }),
  ).toBeVisible()
})

test('page properties stay in Markdown and use the same calendar and draft controls', async ({
  page,
}, testInfo) => {
  const root = createFixtureVaultCopy()
  try {
    await openFixtureVault(page, root, { preserveLearningState: true })
    await page
      .getByTestId('note-list-container')
      .getByText('Alpha Project', { exact: true })
      .click()
    await page.getByRole('tab', { name: 'Flashcards', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Add card', exact: true }),
    ).toBeEnabled()
    const tools = page.getByRole('button', {
      name: 'Page properties',
      exact: true,
    })
    if (!(await tools.isVisible()))
      await page
        .getByRole('button', { name: 'Open the properties panel', exact: true })
        .click()
    await tools.click()
    const dialog = page.getByRole('dialog', {
      name: 'Page properties',
      exact: true,
    })
    await addProperty(page, dialog, 'page_flag', 'Boolean')
    await expect(
      dialog.getByRole('switch', { name: 'page_flag' }),
    ).not.toBeChecked()
    await addProperty(page, dialog, 'page_list', 'Text list')
    await dialog
      .getByRole('group', { name: 'page_list', exact: true })
      .getByRole('button', { name: 'Add item', exact: true })
      .click()
    await dialog.getByLabel('page_list 1', { exact: true }).fill('a,b')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog).toBeHidden({ timeout: 10000 })
    await expect
      .poll(() =>
        fs.readFileSync(path.join(root, 'project/alpha-project.md'), 'utf8'),
      )
      .toContain('page_flag: false')
    await page.reload()
    await page
      .getByTestId('note-list-container')
      .getByText('Alpha Project', { exact: true })
      .click()
    if (!(await tools.isVisible()))
      await page
        .getByRole('button', { name: 'Open the properties panel', exact: true })
        .click()
    await tools.click()
    await expect(
      dialog.getByRole('switch', { name: 'page_flag' }),
    ).not.toBeChecked()
    await expect(dialog.getByLabel('page_list 1', { exact: true })).toHaveValue(
      'a,b',
    )
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    const dark = page.getByRole('button', {
      name: 'Switch to dark mode',
      exact: true,
    })
    if (
      !(await page.locator('html').getAttribute('class'))
        ?.split(' ')
        .includes('dark')
    )
      await dark.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await tools.click()
    await page.setViewportSize({ width: 480, height: 800 })
    await page.screenshot({
      path: testInfo.outputPath('page-properties-dark-compact.png'),
      animations: 'disabled',
    })
    const bounds = await dialog
      .getByRole('button', { name: 'Save', exact: true })
      .boundingBox()
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(800)
  } finally {
    removeFixtureVaultCopy(root)
  }
})
