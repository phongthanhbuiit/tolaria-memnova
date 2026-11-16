import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { openFixtureVaultDesktopHarness, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { createNoteMemoryFixture } from '../helpers/noteMemoryFixture'

test('a saved view filters due notes and opens only its matching ready owner for review', async ({ page }, info) => {
  const root = createNoteMemoryFixture()
  const originals = new Map<string, string>()
  try {
    for (const [title, enabled, included] of [
      ['Included', true, true],
      ['Paused', false, true],
      ['Unrelated', true, false],
    ] as const) {
      const file = path.join(root, title + '.md')
      const body = `---\n_memnova_page_id: ${randomUUID()}\n_memnova_learning_version: 1\n_memnova_learning_enabled: ${enabled}\n_memnova_back_kind: inline\n---\n# ${title}\n\nRecall ${title}.\n\n<!-- FLASHCARD:BACK -->\nThe ${title} mnemonic.\n`
      const source = included ? body.replace('---\n', '---\ncourse: biology\n') : body
      fs.writeFileSync(file, source)
      originals.set(file, source)
    }
    await openFixtureVaultDesktopHarness(page, root, {
      expectedReadyTitle: 'Biology study list', preserveLearningState: true,
      views: [{ filename: 'biology.yml', definition: { name: 'Biology study list', icon: null, color: null, sort: null,
        filters: { all: [{ field: 'course', op: 'equals', value: 'biology' }] } } }],
    })
    await page.evaluate(() => {
      const handlers = window.__mockHandlers
      if (!handlers) throw new Error('Missing desktop fixture handlers')
      handlers.learning_command = async args => {
        const fixtureModule = '/src/mock-tauri/index.ts'
        const { mockInvoke } = await import(fixtureModule)
        return mockInvoke('learning_command', args)
      }
    })
    await page.getByText('Biology study list', { exact: true }).click()
    const list = page.getByTestId('note-list-container')
    await expect(list.getByText('Paused', { exact: true })).toBeVisible()
    const filter = page.getByRole('switch', { name: 'Due', exact: true })
    await filter.click()
    await expect(list.getByText('Included', { exact: true })).toBeVisible()
    await expect(list.getByText('Paused', { exact: true })).toHaveCount(0)
    await expect(list.getByText('Unrelated', { exact: true })).toHaveCount(0)
    const start = page.getByRole('button', { name: 'Study due notes (1)', exact: true })
    await page.route('**/api/vault/all-content*', route => route.fulfill({
      status: 503, json: { error: 'Study refresh unavailable' },
    }))
    await start.click()
    await expect(page.getByText('Error: Study refresh unavailable', { exact: true })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.unroute('**/api/vault/all-content*')
    await start.click()
    const study = page.getByRole('dialog')
    await expect(study).toContainText('Recall Included.')
    await expect(study.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '1')
    await study.getByRole('button', { name: 'Show mnemonic', exact: true }).click()
    await expect(study).toContainText('The Included mnemonic.')
    await study.getByRole('button', { name: /^Good/ }).click()
    await study.getByRole('button', { name: 'Close', exact: true }).click()
    const empty = page.getByRole('button', { name: 'Study due notes (0)', exact: true })
    await expect(empty).toBeFocused()
    await expect(empty).toBeDisabled()
    await filter.focus()
    await page.keyboard.press('Space')
    await expect(list.getByText('Paused', { exact: true })).toBeVisible()
    await page.screenshot({ path: info.outputPath('saved-view-study.png') })
    for (const [file, text] of originals) expect(fs.readFileSync(file, 'utf8')).toBe(text)
  } finally {
    await page.close()
    removeFixtureVaultCopy(root)
  }
})
