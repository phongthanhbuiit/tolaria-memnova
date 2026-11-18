import { readFileSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { triggerMenuCommand } from '../smoke/testBridge'

const english = JSON.parse(readFileSync('src/lib/locales/en.json', 'utf8')) as Record<string, string>
const vietnamese = JSON.parse(readFileSync('src/lib/locales/vi.json', 'utf8')) as Record<string, string>

interface SurfaceLabel {
  value: string
  kind: string
}

function snapshotLabels(snapshot: string): SurfaceLabel[] {
  return snapshot.split('\n').flatMap((line) => {
    const name = line.match(/^\s*- ([\w-]+) ("(?:[^"\\]|\\.)*")/)
    const copy = line.match(/^\s*- ([\w-]+)(?: \[[^\]]+\])*: (.+)$/)
    return [name && { kind: name[1], value: name[2] }, copy && { kind: copy[1], value: copy[2] }]
      .filter((label): label is SurfaceLabel => label !== null)
      .map(({ kind, value }) => ({
        kind,
        value: value.startsWith('"') && value.endsWith('"') ? JSON.parse(value) as string : value,
      }))
  })
}

async function surfaceLabels(page: Page): Promise<SurfaceLabel[]> {
  const attributes = await page.locator('[placeholder]:visible, [title]:visible').evaluateAll((elements) =>
    elements.flatMap(element => ['placeholder', 'title'].flatMap(kind => {
      const value = element.getAttribute(kind)
      return value ? [{ kind, value }] : []
    })),
  )
  return [...snapshotLabels(await page.locator('body').ariaSnapshot()), ...attributes]
}

function retainedEnglish(surface: string, { value, kind }: SurfaceLabel): string | undefined {
  if (value === 'Git') return 'Git product name'
  if (value === 'Notes' && kind === 'heading') return 'Fixture Markdown heading'
  if ((value === 'Notes' || value === 'Events') && (kind === 'generic' || kind === 'text')) return 'Fixture sidebarLabel'
  if (value === 'Active' && ['Properties form', 'AI workspace'].includes(surface)) return 'Fixture frontmatter value'
  if (surface === 'typed Properties editor' && ['Status', 'Related to'].includes(value)) return 'Fixture property key'
  return undefined
}

test.use({ locale: 'vi-VN' })

test('Vietnamese main surfaces expose translated catalog labels', async ({ page }, testInfo) => {
  const vault = createFixtureVaultCopy()
  const matches: (SurfaceLabel & { surface: string; keys: string[]; retained?: string })[] = []
  async function scan(surface: string) {
    const labels = await surfaceLabels(page)
    const unique = new Map(labels.map(label => [JSON.stringify(label), label]))
    for (const label of unique.values()) {
      const keys = Object.keys(english).filter(key => english[key] === label.value)
      if (keys.length) matches.push({ ...label, surface, keys, retained: retainedEnglish(surface, label) })
    }
  }

  try {
    await openFixtureVault(page, vault)
    await expect(page.getByRole('button', { name: vietnamese['status.settings.open'], exact: true })).toBeVisible()
    await scan('sidebar, list, empty editor and status')
    await page.getByText('Alpha Project', { exact: true }).first().click()
    await expect(page.getByRole('heading', { name: 'Alpha Project', level: 1 })).toBeVisible()
    await scan('editor')
    const addProperty = page.getByTestId('add-property-row')
    if (!(await addProperty.isVisible())) {
      await page.getByRole('button', { name: vietnamese['editor.toolbar.openProperties'], exact: true }).click()
    }
    await addProperty.click()
    const propertyForm = page.getByTestId('add-property-form')
    await expect(propertyForm).toBeVisible()
    await scan('Properties form')
    await page.getByTestId('add-property-cancel').click()
    await page.getByRole('button', { name: 'Chỉnh sửa thuộc tính', exact: true }).click()
    const propertyEditor = page.getByRole('dialog', { name: 'Chỉnh sửa thuộc tính', exact: true })
    await expect(propertyEditor).toBeVisible()
    await scan('typed Properties editor')
    await expect.soft(propertyEditor.getByRole('button', { name: 'Lưu', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(propertyEditor).toBeHidden()

    await page.getByRole('button', { name: 'Trang chủ', exact: true }).click()
    await expect(page.locator('.app__dashboard')).toBeVisible()
    await scan('Home')
    await page.getByRole('button', { name: vietnamese['sidebar.action.createView'], exact: true }).click()
    const viewDialog = page.getByRole('dialog')
    await expect(viewDialog).toBeVisible()
    await scan('saved view editor')
    await page.keyboard.press('Escape')
    await expect(viewDialog).toBeHidden()

    for (const [command, ready] of [
      ['file-quick-open', page.getByTestId('quick-open-palette')],
      ['view-command-palette', page.getByPlaceholder(vietnamese['command.palettePlaceholder'])],
      ['app-settings', page.getByTestId('settings-panel')],
      ['edit-find-in-vault', page.getByRole('button', { name: vietnamese['a11y.closeSearch'], exact: true })],
    ] as const) {
      await triggerMenuCommand(page, command)
      await expect(ready).toBeVisible()
      await scan(command)
      if (command === 'file-quick-open') {
        await ready.getByRole('button', { name: 'Đóng cửa sổ mở nhanh', exact: true }).click({ position: { x: 12, y: 12 } })
      } else {
        await page.keyboard.press('Escape')
      }
      await expect(ready).toBeHidden()
    }
    await page.getByTestId('sidebar-top-nav').getByRole('button', { name: /^Tất cả ghi chú/ }).click()
    await page.getByTestId('note-list-container').getByText('Alpha Project', { exact: true }).click()
    await page.getByRole('button', { name: 'Mở bảng AI', exact: true }).click()
    await expect(page.getByTestId('ai-workspace')).toBeVisible()
    await scan('AI workspace')
  } finally {
    await testInfo.attach('english-catalog-matches.json', { body: JSON.stringify(matches, null, 2), contentType: 'application/json' })
    removeFixtureVaultCopy(vault)
  }
  expect(matches.filter(match => !match.retained)).toEqual([])
})
