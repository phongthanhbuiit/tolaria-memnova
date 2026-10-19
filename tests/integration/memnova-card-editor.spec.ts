import fs from 'node:fs'
import { test, expect, type Page, type Locator } from '@playwright/test'
import {
  createFixtureVaultCopy,
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'

test.setTimeout(180_000)
const catalog = (locale = 'en') =>
  JSON.parse(
    fs.readFileSync(`src/lib/locales/${locale}.json`, 'utf8'),
  ) as Record<string, string>
let fixtureSequence = 0
async function openRetainedDraft(page: Page, root: string, copy: Record<string,string>) {
  const title = `Legacy editor fixture ${++fixtureSequence}`
  await page.evaluate(async ({root,title}) => {
    const modulePath = '/src/lib/learning/client.ts'
    const { LearningClient } = await import(modulePath)
    const client = await LearningClient.connect(root)
    const owner = await client.ensurePage('project/alpha-project.md')
    await client.createCard(owner.id, { front: title, back: '', answerMode: 'inline', status: 'draft', position: (await client.listCards(owner.id)).length, properties: {} })
  }, {root,title})
  await page.reload()
  await page.getByTestId('note-list-container').getByText('Alpha Project', { exact: true }).click()
  await page.getByRole('tab', {name:copy['learning.noteMemory.management'],exact:true}).click()
  const retained = page.getByRole('button', {name:new RegExp(copy['learning.noteMemory.legacyCards'])})
  if (await retained.getAttribute('aria-expanded') !== 'true') await retained.click()
  await page.getByRole('button',{name:title,exact:true}).click()
  return page.getByRole('dialog',{name:copy['learning.editCard'],exact:true})
}
async function openCard(page: Page, root: string, copy: Record<string,string>) {
  page.setDefaultTimeout(15_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openFixtureVault(page, root, { preserveLearningState: true })
  return openRetainedDraft(page,root,copy)
}
async function addField(
  page: Page,
  dialog: Locator,
  name: string,
  kind = 'Number',
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
async function manage(
  page: Page,
  dialog: Locator,
  name: string,
  action: string,
) {
  await dialog
    .getByRole('button', { name: `Manage field ${name}`, exact: true })
    .click()
  await page.getByRole('menuitem', { name: action, exact: true }).click()
}
async function learningState(page: Page) {
  return page.evaluate(() =>
    JSON.stringify(
      Object.entries(localStorage)
        .filter(([key]) => key.startsWith('memnova:qa-learning:'))
        .sort(),
    ),
  )
}
async function contrast(dialog: Locator, selector: string) {
  return dialog.evaluate((el, selector) => {
    const node = el.querySelector(selector)!
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = getComputedStyle(el).backgroundColor
    ctx.fillRect(0, 0, 1, 1)
    const bg = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3)
    ctx.fillStyle = getComputedStyle(node).color
    if (selector.includes('button')) {
      ctx.fillStyle = getComputedStyle(node).backgroundColor
      ctx.fillRect(0, 0, 1, 1)
    }
    const background = selector.includes('button')
      ? Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3)
      : bg
    ctx.fillStyle = getComputedStyle(node).color
    ctx.fillRect(0, 0, 1, 1)
    const fg = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3)
    const lum = (rgb: number[]) =>
      rgb
        .map((x) => x / 255)
        .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
        .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0)
    const a = lum(background),
      b = lum(fg)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }, selector)
}
test('contextual draft actions preserve local state, Cancel and committed values', async ({
  page,
}) => {
  const root = createFixtureVaultCopy()
  try {
    let dialog = await openCard(page, root, catalog())
    await dialog
      .getByRole('textbox', { name: 'Question', exact: true })
      .fill('Editor interaction regression')
    await addField(page, dialog, 'priority')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog).toBeHidden()
    const before = await learningState(page)
    await page
      .getByRole('button', {
        name: 'Editor interaction regression',
        exact: true,
      })
      .click()
    dialog = page.getByRole('dialog', { name: 'Edit card', exact: true })
    await manage(page, dialog, 'priority', 'Rename')
    const rename = dialog.getByRole('textbox', {
      name: 'Property name priority',
      exact: true,
    })
    await expect(rename).toBeFocused()
    await rename.fill('score')
    const section = dialog.getByRole('button', {
      name: 'Card properties (1)',
      exact: true,
    })
    await section.click()
    await section.click()
    await expect(rename).toHaveValue('score')
    await dialog
      .getByRole('button', { name: 'Apply name', exact: true })
      .click()
    await dialog.getByRole('textbox', { name: 'score', exact: true }).fill('-')
    await section.click()
    await section.click()
    await expect(
      dialog.getByRole('textbox', { name: 'score', exact: true }),
    ).toHaveValue('-')
    await expect(
      dialog.getByRole('button', { name: 'Save', exact: true }),
    ).toBeDisabled()
    await dialog.getByRole('textbox', { name: 'score', exact: true }).fill('12')
    await manage(page, dialog, 'score', 'Change type')
    await dialog
      .getByRole('combobox', { name: 'Property type score', exact: true })
      .click()
    await page.getByRole('option', { name: 'Text', exact: true }).click()
    await section.click()
    await section.click()
    await expect(
      dialog.getByRole('button', { name: 'Apply type', exact: true }),
    ).toHaveAttribute('data-variant', 'secondary')
    await dialog
      .getByRole('button', { name: 'Apply type', exact: true })
      .click()
    expect(await learningState(page)).toBe(before)
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toBeHidden()
    expect(await learningState(page)).toBe(before)
    await page
      .getByRole('button', {
        name: 'Editor interaction regression',
        exact: true,
      })
      .click()
    dialog = page.getByRole('dialog', { name: 'Edit card', exact: true })
    await expect(
      dialog.getByRole('textbox', { name: 'priority', exact: true }),
    ).toHaveValue('0')
    await manage(page, dialog, 'priority', 'Rename')
    await dialog
      .getByRole('textbox', { name: 'Property name priority', exact: true })
      .fill('score')
    await dialog
      .getByRole('button', { name: 'Apply name', exact: true })
      .click()
    await dialog.getByRole('textbox', { name: 'score', exact: true }).fill('7')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog).toBeHidden()
    await page.reload()
    await page
      .getByTestId('note-list-container')
      .getByText('Alpha Project', { exact: true })
      .click()
    await page.getByRole('tab', { name: 'Memorization', exact: true }).click()
    await page.getByRole('button', { name: /^Old cards \(\d+\)$/ }).click()
    await page
      .getByRole('button', {
        name: 'Editor interaction regression',
        exact: true,
      })
      .click()
    await expect(
      page.getByRole('textbox', { name: 'score', exact: true }),
    ).toHaveValue('7')
    dialog = page.getByRole('dialog', { name: 'Edit card', exact: true })
    await manage(page, dialog, 'score', 'Remove')
    await expect(
      dialog.getByRole('button', { name: 'Add property', exact: true }),
    ).toBeFocused()
  } finally {
    removeFixtureVaultCopy(root)
  }
})

test('editor typography and footer reflow across themes, locales and small windows', async ({
  browser,
}, testInfo) => {
  const results = []
  for (const locale of ['en', 'vi', 'de-DE']) {
    const root = createFixtureVaultCopy(),
      context = await browser.newContext({ locale })
    const page = await context.newPage(),
      copy = catalog(locale)
    try {
      await openCard(page, root, copy)
      await page
        .getByRole('dialog')
        .getByRole('button', { name: copy['common.cancel'], exact: true })
        .click()
      for (const theme of ['light', 'dark']) {
        if ((await page.locator('html').getAttribute('data-theme')) !== theme) {
          const en = catalog(),
            label =
              theme === 'dark' ? 'Switch to dark mode' : 'Switch to light mode'
          const key = Object.keys(en).find((key) => en[key] === label)!
          await page
            .getByRole('button', { name: copy[key], exact: true })
            .click()
        }
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        for (const preset of locale === 'en'
          ? ['basic', 'vocabulary']
          : ['vocabulary']) {
          let dialog = await openRetainedDraft(page,root,copy)
          const question = `UI ${locale} ${theme} ${preset} — Nội dung ghi nhớ Unicode.`
          await dialog
            .getByRole('textbox', { name: copy['learning.front'], exact: true })
            .fill(question)
          await dialog
            .getByRole('combobox', {
              name: copy['learning.cardType'],
              exact: true,
            })
            .click()
          await page
            .getByRole('option', {
              name: copy[`learning.${preset}`],
              exact: true,
            })
            .click()
          for (const mode of ['draft', 'saved']) {
            if (locale === 'en' || mode === 'saved')
              for (const [width, height] of locale === 'en'
                ? [
                    [1280, 900],
                    [768, 800],
                    [480, 800],
                    [480, 640],
                  ]
                : [
                    [480, 800],
                    [480, 640],
                  ]) {
                await page.setViewportSize({ width, height })
                const input = dialog.getByRole('textbox', {
                  name: copy['learning.front'],
                  exact: true,
                })
                await input.scrollIntoViewIfNeeded()
                await expect(input).toHaveCSS('font-size', '14px')
                await expect(input).toHaveCSS('font-weight', '400')
                await expect(
                  dialog.locator('[data-slot="dialog-title"]'),
                ).toHaveCSS('font-size', '16px')
                const save = dialog.getByRole('button', {
                    name: copy['common.save'],
                    exact: true,
                  }),
                  box = await save.boundingBox()
                expect(box!.y + box!.height).toBeLessThanOrEqual(height)
                expect(box!.x + box!.width).toBeLessThanOrEqual(width)
                expect(
                  await dialog.locator('[data-variant="default"]').count(),
                ).toBe(1)
                console.log('contrast', {
                  locale,
                  theme,
                  helper: await contrast(
                    dialog,
                    '[data-slot="dialog-description"]',
                  ),
                  primary: await contrast(
                    dialog,
                    'button[data-variant="default"]',
                  ),
                })
                expect(
                  await contrast(dialog, '[data-slot="dialog-description"]'),
                ).toBeGreaterThanOrEqual(4.5)
                expect(
                  await contrast(dialog, 'button[data-variant="default"]'),
                ).toBeGreaterThanOrEqual(4.5)
                const size = await dialog
                  .getByRole('combobox', {
                    name: copy['learning.status'],
                    exact: true,
                  })
                  .boundingBox()
                expect(size!.height).toBe(32)
                results.push({
                  locale,
                  theme,
                  preset,
                  mode,
                  width,
                  height,
                  save: box,
                  status: size,
                })
                await page.screenshot({
                  path: testInfo.outputPath(
                    `${locale}-${theme}-${preset}-${mode}-${width}-${height}.png`,
                  ),
                  animations: 'disabled',
                })
              }
            if (mode === 'draft') {
              await dialog
                .getByRole('button', { name: copy['common.save'], exact: true })
                .click()
              await expect(dialog).toBeHidden()
              await page
                .getByRole('button', { name: question, exact: true })
                .click()
              dialog = page.getByRole('dialog', {
                name: copy['learning.editCard'],
                exact: true,
              })
            } else {
              await dialog
                .getByRole('button', {
                  name: copy['common.cancel'],
                  exact: true,
                })
                .click()
              await expect(dialog).toBeHidden()
            }
          }
        }
      }
    } finally {
      await context.close()
      removeFixtureVaultCopy(root)
    }
  }
  fs.writeFileSync(
    testInfo.outputPath('layout-measurements.json'),
    JSON.stringify(results, null, 2),
  )
})

test('legacy editor honors application CSS zoom with reachable footer and focused controls', async ({
  page,
  browser,
}, testInfo) => {
  const root = createFixtureVaultCopy()
  try {
    const dialog = await openCard(page, root, catalog())
    await dialog
      .getByRole('textbox', { name: 'Question', exact: true })
      .fill('Zoom regression')
    for (const zoom of [1.25, 1.5]) {
      await page.evaluate(zoom => {
        document.documentElement.style.zoom = `${zoom * 100}%`
        document.documentElement.style.setProperty('--tolaria-overlay-zoom-factor',String(zoom))
        document.documentElement.style.setProperty('--tolaria-overlay-zoom-inverse',String(1 / zoom))
        window.dispatchEvent(new Event('laputa-zoom-change'))
      },zoom)
      await expect
        .poll(() => page.locator('html').evaluate((el) => el.style.zoom))
        .toBe(`${zoom * 100}%`)
      await page.setViewportSize({ width: 480, height: 640 })
      const save = dialog.getByRole('button', { name: 'Save', exact: true }),
        box = await save.boundingBox()
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(box!.y + box!.height).toBeLessThanOrEqual(640)
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(480)
      await dialog
        .getByRole('button', { name: 'Add property', exact: true })
        .click()
      const name = dialog.getByRole('textbox', {
        name: 'Property name',
        exact: true,
      })
      await expect(name).toBeFocused()
      const field = await name.boundingBox(),
        footer = await save.boundingBox()
      expect(field!.y + field!.height).toBeLessThan(footer!.y)
      await dialog
        .getByRole('group', { name: 'Add property', exact: true })
        .getByRole('button', { name: 'Cancel', exact: true })
        .click()
      await page.screenshot({
        path: testInfo.outputPath(`zoom-${zoom}.png`),
        animations: 'disabled',
      })
    }
  } finally {
    removeFixtureVaultCopy(root)
  }
  const touchRoot = createFixtureVaultCopy(),
    touchContext = await browser.newContext({
      hasTouch: true,
      viewport: { width: 480, height: 640 },
    })
  try {
    const touch = await touchContext.newPage(),
      form = await openCard(touch, touchRoot, catalog())
    expect(
      await touch.evaluate(() => matchMedia('(pointer: coarse)').matches),
    ).toBe(true)
    await expect(form).toHaveCSS('animation-name', 'none')
    expect(
      (await form
        .getByRole('button', { name: 'Save', exact: true })
        .boundingBox())!.height,
    ).toBeGreaterThanOrEqual(44)
    expect(
      (await form
        .getByRole('combobox', { name: 'Status', exact: true })
        .boundingBox())!.height,
    ).toBeGreaterThanOrEqual(44)
    expect(
      await form
        .getByRole('textbox', { name: 'Question', exact: true })
        .evaluate((el) => el === document.activeElement),
    ).toBe(false)
    await addField(touch, form, 'touch_score')
    const iconBox = await form
      .getByRole('button', { name: 'Manage field touch_score', exact: true })
      .boundingBox()
    expect(iconBox!.width).toBeGreaterThanOrEqual(44)
    expect(iconBox!.height).toBeGreaterThanOrEqual(44)
  } finally {
    await touchContext.close()
    removeFixtureVaultCopy(touchRoot)
  }
})

test('type management focuses the selector and returns to the menu on either Cancel path', async ({
  page,
}) => {
  const root = createFixtureVaultCopy()
  try {
    const dialog = await openCard(page, root, catalog())
    await addField(page, dialog, 'score')
    const menu = dialog.getByRole('button', {
      name: 'Manage field score',
      exact: true,
    })
    await menu.press('ArrowDown')
    await page
      .getByRole('menuitem', { name: 'Change type', exact: true })
      .press('Enter')
    const kind = dialog.getByRole('combobox', {
      name: 'Property type score',
      exact: true,
    })
    await expect(kind).toBeFocused()
    await kind.click()
    await page.getByRole('option', { name: 'Text', exact: true }).click()
    await expect(kind).toHaveText('Text')
    await dialog
      .getByRole('group', { name: 'Apply type score' })
      .getByRole('button', { name: 'Cancel', exact: true })
      .click()
    await expect(menu).toBeFocused()
    await manage(page, dialog, 'score', 'Change type')
    await expect(kind).toBeFocused()
    await expect(kind).toHaveText('Number')
    await dialog
      .getByRole('group', { name: 'score', exact: true })
      .getByRole('button', { name: 'Cancel', exact: true })
      .click()
    await expect(menu).toBeFocused()
  } finally {
    removeFixtureVaultCopy(root)
  }
})

test('conversion tracks current edits and rejection before the explicit card Save', async ({
  page,
}) => {
  const root = createFixtureVaultCopy()
  try {
    let dialog = await openCard(page, root, catalog())
    await dialog
      .getByRole('textbox', { name: 'Question', exact: true })
      .fill('Current conversion regression')
    await addField(page, dialog, 'score')
    await manage(page, dialog, 'score', 'Change type')
    let kind = dialog.getByRole('combobox', {
      name: 'Property type score',
      exact: true,
    })
    await kind.click()
    await page.getByRole('option', { name: 'Text', exact: true }).click()
    await dialog.getByRole('textbox', { name: 'score', exact: true }).fill('42')
    await expect(
      dialog.getByRole('group', { name: 'Apply type score' }),
    ).toContainText('"42"')
    await dialog
      .getByRole('button', { name: 'Apply type', exact: true })
      .click()
    await expect(
      dialog.getByRole('textbox', { name: 'score', exact: true }),
    ).toHaveValue('42')
    await manage(page, dialog, 'score', 'Change type')
    kind = dialog.getByRole('combobox', {
      name: 'Property type score',
      exact: true,
    })
    await kind.click()
    await page.getByRole('option', { name: 'Number', exact: true }).click()
    await dialog
      .getByRole('textbox', { name: 'score', exact: true })
      .fill('invalid')
    await expect(dialog.getByRole('alert')).toContainText('lose information')
    await expect(
      dialog.getByRole('button', { name: 'Apply type', exact: true }),
    ).toBeHidden()
    await dialog.getByRole('textbox', { name: 'score', exact: true }).fill('17')
    await expect(dialog.getByRole('alert')).toBeHidden()
    await kind.click()
    await page.getByRole('option', { name: 'Date', exact: true }).click()
    await expect(kind).toHaveText('Date')
    await expect(dialog.getByRole('alert')).toContainText('lose information')
    await expect(
      dialog.getByRole('button', { name: 'Apply type', exact: true }),
    ).toBeHidden()
    await kind.click()
    await page.getByRole('option', { name: 'Number', exact: true }).click()
    await dialog
      .getByRole('button', { name: 'Apply type', exact: true })
      .click()
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog).toBeHidden()
    await page.reload()
    await openFixtureVault(page, root, { preserveLearningState: true })
    await page
      .getByTestId('note-list-container')
      .getByText('Alpha Project', { exact: true })
      .click()
    await page.getByRole('tab', { name: 'Memorization', exact: true }).click()
    await page.getByRole('button', { name: /^Old cards \(\d+\)$/ }).click()
    await page
      .getByRole('button', {
        name: 'Current conversion regression',
        exact: true,
      })
      .click()
    dialog = page.getByRole('dialog', { name: 'Edit card', exact: true })
    await expect(
      dialog.getByRole('textbox', { name: 'score', exact: true }),
    ).toHaveValue('17')
    await expect(
      dialog.getByRole('textbox', { name: 'score', exact: true }),
    ).toHaveAttribute('inputmode', 'decimal')
  } finally {
    removeFixtureVaultCopy(root)
  }
})
