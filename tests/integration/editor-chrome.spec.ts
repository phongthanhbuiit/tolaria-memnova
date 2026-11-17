import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'

test.describe.configure({ retries: 0 })

test('empty H1 hint is faint and upright without writing the note', async ({ page }) => {
  const root=createFixtureVaultCopy()
  fs.writeFileSync(path.join(root,'empty-title-d3.md'),'# \n\n')
  try {
    await openFixtureVault(page,root)
    await page.getByRole('button',{name:/^All Notes/}).click()
    await page.getByTestId('note-title-row').filter({hasText:'empty-title-d3'}).click()
    const title=page.locator('.editor__blocknote-container h1').first()
    await expect(title).toBeVisible()
    const style=await title.evaluate(el=>({font:getComputedStyle(el,'::before').fontStyle,weight:getComputedStyle(el,'::before').fontWeight,color:getComputedStyle(el,'::before').color,faint:getComputedStyle(document.documentElement).getPropertyValue('--text-faint')}))
    expect(style.font).toBe('normal')
    expect(style.weight).toBe('400')
    const faint = await title.evaluate(el => {
      const probe = document.createElement('span')
      probe.style.color = 'var(--text-faint)'
      document.body.append(probe)
      const color = getComputedStyle(probe).color
      probe.remove()
      return { expected: color, actual: getComputedStyle(el, '::before').color }
    })
    expect(faint.actual).toBe(faint.expected)
    expect(fs.readFileSync(path.join(root,'empty-title-d3.md'),'utf8')).toBe('# \n\n')
  } finally {removeFixtureVaultCopy(root)}
})

test('breadcrumb displays the title and icon hints work with mouse and keyboard', async ({ page }) => {
  const root = createFixtureVaultCopy()
  const filename = path.join(root, 'stable-slug-d3.md')
  const content = '# A readable title — D3\n\nAn ordinary paragraph.\n'
  fs.writeFileSync(filename, content)
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openFixtureVault(page, root)
    await page.getByRole('button', { name: /^All Notes/ }).click()
    await page.getByTestId('note-title-row').filter({ hasText: 'A readable title — D3' }).click()
    const trigger = page.getByTestId('breadcrumb-filename-trigger')
    await expect(trigger).toHaveText('A readable title — D3')
    await expect(trigger).toHaveAccessibleName('A readable title — D3')
    await expect(trigger).toHaveAccessibleDescription('Filename stable-slug-d3. Press Enter to rename')
    await trigger.dblclick()
    await expect(page.getByTestId('breadcrumb-filename-input')).toHaveValue('stable-slug-d3')
    await page.getByTestId('breadcrumb-filename-input').press('Escape')
    await expect(trigger).toHaveText('A readable title — D3')
    const actions = page.locator('.breadcrumb-bar__actions button:visible')
    expect(await actions.count()).toBeGreaterThan(0)
    for (const button of await actions.all()) {
      const label = await button.getAttribute('aria-label')
      expect(label).toBeTruthy()
      await button.hover()
      await expect(page.getByRole('tooltip')).toContainText(label ?? '')
      await page.mouse.move(0, 0)
      await button.focus()
      await expect(button).toBeFocused()
      await expect(page.getByRole('tooltip')).toContainText(label ?? '')
      await button.press('Escape')
      await expect(page.getByRole('tooltip')).toBeHidden()
    }
    expect(fs.readFileSync(filename, 'utf8')).toBe(content)
    expect(fs.readdirSync(root)).toContain('stable-slug-d3.md')
  } finally {
    removeFixtureVaultCopy(root)
  }
})
