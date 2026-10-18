import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { expect, test, type Page } from '@playwright/test'
import { openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { createNoteMemoryFixture } from '../helpers/noteMemoryFixture'

test.use({ actionTimeout: 10_000 })

async function openNote(page: Page, title: string) {
  await page.keyboard.press('Meta+o')
  const palette = page.getByTestId('quick-open-palette')
  await expect(palette).toBeVisible()
  await palette.getByPlaceholder('Search notes...').fill(title)
  await page.keyboard.press('Enter')
  await expect(palette).toBeHidden()
  await expect(page.locator('.bn-editor h1').first()).toHaveText(title)
}

test('ordinary A4 note open and explicit save measurements', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  const root = createNoteMemoryFixture()
  const target = path.join(root, 'project/alpha-project.md')
  const apiOrigin = process.env.MEMNOVA_PERF_API_ORIGIN
  if (apiOrigin) {
    await page.route('**/api/**', async (route) => {
      const request = new URL(route.request().url())
      const response = await route.fetch({ url: `${apiOrigin}${request.pathname}${request.search}` })
      await route.fulfill({ response })
    })
  }
  const measurements: Array<{ openMs: number; saveMs: number }> = []
  try {
    await openFixtureVault(page, root)
    await page.getByRole('button', { name: /^All Notes/ }).click()
    for (let index = 0; index < 23; index += 1) {
      await openNote(page, 'Source note')
      const opened = performance.now()
      await openNote(page, 'Alpha Project')
      await expect(page.locator('.bn-editor')).toContainText('Section 48')
      const openMs = performance.now() - opened
      if (index === 0) await page.screenshot({ path: testInfo.outputPath('a4-front-baseline.png') })
      const paragraph = page.locator('.bn-editor [data-content-type="paragraph"]').last()
      await paragraph.click()
      await page.keyboard.press('End')
      const marker = `measurement-${index}`
      await page.keyboard.insertText(marker)
      const saved = performance.now()
      await page.keyboard.press('Meta+s')
      await expect.poll(() => fs.readFileSync(target, 'utf8'), { intervals: [10, 20, 50] }).toContain(marker)
      if (index >= 3) measurements.push({ openMs, saveMs: performance.now() - saved })
      fs.writeFileSync(testInfo.outputPath('samples.json'), JSON.stringify(measurements))
    }
    const p95 = (key: 'openMs' | 'saveMs') => [...measurements].map(value => value[key]).sort((a, b) => a - b)[18]
    const report = {
      mode: apiOrigin ? 'production-renderer-dev-file-api' : 'development-renderer',
      platform: `${os.platform()} ${os.arch()}`,
      cpu: os.cpus()[0]?.model,
      bytes: fs.statSync(target).size,
      warmups: 3,
      samples: measurements,
      p95: { openMs: p95('openMs'), saveMs: p95('saveMs') },
    }
    fs.writeFileSync(testInfo.outputPath('performance.json'), JSON.stringify(report, null, 2))
    await testInfo.attach('note-memory-performance', { body: JSON.stringify(report, null, 2), contentType: 'application/json' })
    await page.screenshot({ path: testInfo.outputPath('a4-baseline.png') })
  } finally {
    removeFixtureVaultCopy(root)
  }
})
