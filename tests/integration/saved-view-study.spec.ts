import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { openFixtureVaultDesktopHarness, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { createNoteMemoryFixture } from '../helpers/noteMemoryFixture'

function storedSessions(page: Page, root: string) {
  return page.evaluate(key => {
    const store = JSON.parse(localStorage.getItem(key) ?? '{}') as { sessions?: { id: string; status: string }[] }
    return store.sessions?.map(({ id, status }) => ({ id, status })) ?? []
  }, `memnova:qa-learning:${root}`)
}

test('a ten-note saved view studies its three due notes and resumes the same session after a grade', async ({ page }, info) => {
  const root = createNoteMemoryFixture()
  const originals = new Map<string, string>()
  try {
    await page.setViewportSize({ width: 1280, height: 1080 })
    const included = ['Cell', 'Gene', 'Protein']
    const paused = Array.from({ length: 7 }, (_, index) => `Paused ${index + 1}`)
    for (const title of [...included, ...paused, 'Unrelated']) {
      const enabled = !paused.includes(title)
      const file = path.join(root, title + '.md')
      const body = `---\n_memnova_page_id: ${randomUUID()}\n_memnova_learning_version: 1\n_memnova_learning_enabled: ${enabled}\n_memnova_back_kind: inline\n---\n# ${title}\n\nRecall ${title}.\n\n<!-- FLASHCARD:BACK -->\nThe ${title} mnemonic.\n`
      const source = title === 'Unrelated' ? body : body.replace('---\n', '---\ncourse: biology\n')
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
    for (const title of [...included, ...paused]) await expect(list.getByText(title, { exact: true })).toBeVisible()
    const filter = page.getByRole('switch', { name: 'Due', exact: true })
    await filter.click()
    for (const title of included) await expect(list.getByText(title, { exact: true })).toBeVisible()
    for (const title of paused) await expect(list.getByText(title, { exact: true })).toHaveCount(0)
    await expect(list.getByText('Unrelated', { exact: true })).toHaveCount(0)
    const start = page.getByRole('button', { name: 'Study due notes (3)', exact: true })
    await page.route('**/api/vault/all-content*', route => route.fulfill({
      status: 503, json: { error: 'Study refresh unavailable' },
    }))
    await start.click()
    await expect(page.getByText('Error: Study refresh unavailable', { exact: true })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.unroute('**/api/vault/all-content*')
    await start.click()
    const study = page.getByRole('dialog')
    const progress = study.getByRole('progressbar')
    await expect(progress).toHaveAttribute('aria-valuemax', '3')
    const heading = study.getByRole('heading').first()
    const first = await heading.innerText()
    expect(included).toContain(first)
    const grade = async (title: string) => {
      await expect(study).toContainText(`Recall ${title}.`)
      await study.getByRole('button', { name: 'Show mnemonic', exact: true }).click()
      await expect(study).toContainText(`The ${title} mnemonic.`)
      await study.getByRole('button', { name: /^Easy/ }).click()
    }
    await grade(first)
    await expect(progress).toHaveAttribute('aria-valuenow', '1')
    const second = await heading.innerText()
    await study.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(study).toHaveCount(0)
    const pausedSessions = await storedSessions(page, root)
    expect(pausedSessions).toEqual([{ id: expect.any(String), status: 'paused' }])
    await page.getByRole('button', { name: 'Study due notes (2)', exact: true }).click()
    await expect(progress).toHaveAttribute('aria-valuemax', '3')
    await expect(progress).toHaveAttribute('aria-valuenow', '1')
    await expect(heading).toHaveText(second)
    expect(await storedSessions(page, root)).toEqual([{ id: pausedSessions[0].id, status: 'active' }])
    await study.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(progress).toHaveAttribute('aria-valuenow', '0')
    await expect(heading).toHaveText(first)
    const seen = []
    for (let i = 0; i < included.length; i++) {
      const title = await heading.innerText()
      seen.push(title)
      await grade(title)
      await expect(progress).toHaveAttribute('aria-valuenow', String(i + 1))
    }
    expect(seen.sort()).toEqual([...included].sort())
    await study.getByRole('button', { name: 'Close', exact: true }).click()
    const empty = page.getByRole('button', { name: 'Study due notes (0)', exact: true })
    await expect(empty).toBeFocused()
    await expect(empty).toBeDisabled()
    await filter.focus()
    await page.keyboard.press('Space')
    await expect(list.getByText(paused[0], { exact: true })).toBeVisible()
    await page.screenshot({ path: info.outputPath('saved-view-study.png') })
    for (const [file, text] of originals) expect(fs.readFileSync(file, 'utf8')).toBe(text)
  } finally {
    await page.close()
    removeFixtureVaultCopy(root)
  }
})
