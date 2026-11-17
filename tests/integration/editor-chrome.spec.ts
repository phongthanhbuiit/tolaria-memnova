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
