import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVaultDesktopHarness, removeFixtureVaultCopy } from '../helpers/fixtureVault'

test('long folder names fit the sidebar while vertical scrolling and selection remain usable', async ({ page }, info) => {
  const initial = createFixtureVaultCopy()
  const root = initial + '-3c0def8e-66b6-47cd-8fa4-432ee79d3520-restored-library'
  fs.renameSync(initial, root)
  const longName = 'A very long folder name with no convenient ending ' + 'ReadingMaterial'.repeat(6)
  const folders = Array.from({ length: 30 }, (_, index) => ({
    name: index === 0 ? longName : 'Folder ' + index,
    path: 'folder-' + index,
    children: [],
  }))
  try {
    await page.setViewportSize({ width: 1100, height: 720 })
    await openFixtureVaultDesktopHarness(page, root, { folders })
    const sidebar = page.getByRole('complementary').first()
    const nav = sidebar.locator('nav').first()
    await page.getByRole('button', { name: /^All Notes/ }).click()
    const noteList = page.locator('[data-virtuoso-scroller="true"]')
    await expect(noteList).toBeVisible()
    for (const scroller of [nav, noteList]) {
      await expect(scroller).toHaveCSS('scrollbar-width', 'thin')
      await expect(scroller).toHaveCSS('scrollbar-color', 'rgb(120, 119, 116) rgba(0, 0, 0, 0)')
    }
    await page.emulateMedia({ contrast: 'more' })
    await expect(nav).toHaveCSS('scrollbar-width', 'auto')
    await expect(noteList).toHaveCSS('scrollbar-color', 'rgb(55, 53, 47) rgba(0, 0, 0, 0)')
    await page.emulateMedia({ contrast: 'no-preference', forcedColors: 'active' })
    await expect(nav).toHaveCSS('scrollbar-color', 'auto')
    await expect(noteList).toHaveCSS('scrollbar-width', 'auto')
    await page.emulateMedia({ forcedColors: 'none' })
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
    for (const scroller of [nav, noteList]) {
      await expect(scroller).toHaveCSS('scrollbar-color', 'rgb(184, 177, 166) rgba(0, 0, 0, 0)')
    }
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
    const rootRow = page.getByTestId('folder-row:')
    const child = page.getByTestId('folder-row:folder-0')
    await expect(child).toBeAttached()
    for (const width of [220, 250, 400]) {
      await sidebar.evaluate((element, width) => { element.parentElement!.style.width = width + 'px' }, width)
      await expect.poll(() => nav.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
      await expect(rootRow).toHaveAccessibleName(root.split('/').pop()!)
      const geometry = await child.evaluate(element => {
        const label = element.querySelector('span')!
        return { rowWidth: element.getBoundingClientRect().width, textWidth: label.clientWidth, fullWidth: label.scrollWidth, ellipsis: getComputedStyle(label).textOverflow }
      })
      expect(geometry.rowWidth).toBeLessThanOrEqual(width)
      expect(geometry.fullWidth).toBeGreaterThan(geometry.textWidth)
      expect(geometry.ellipsis).toBe('ellipsis')
    }
    await child.scrollIntoViewIfNeeded()
    await child.click()
    await expect(child).toHaveAccessibleName(longName)
    await rootRow.focus()
    await page.keyboard.press('Tab')
    await expect(child).toBeFocused()
    await expect(page.getByRole('tooltip')).toContainText('folder-0')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await nav.evaluate(element => { element.scrollTop = element.scrollHeight })
    await expect.poll(() => nav.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
    await expect(page.getByTestId('folder-row:folder-29')).toBeInViewport()
    await page.screenshot({ path: info.outputPath('sidebar-long-folders.png') })
  } finally {
    await page.close()
    removeFixtureVaultCopy(root)
  }
})
