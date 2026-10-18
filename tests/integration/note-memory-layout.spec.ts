import { expect, test } from '@playwright/test'
const revealLabels = { en: 'Show mnemonic', vi: 'Xem gợi nhớ', 'de-DE': 'Merkhilfe anzeigen' }

test('note controls use the system type scale and expose a primary study action', async ({ page }) => {
  await page.goto('/tests/fixtures/note-memory-layout.html')
  const study = page.getByRole('button', { name: 'Study', exact: true })
  await expect(study).toBeEnabled()
  expect(await study.evaluate(element => getComputedStyle(element).fontSize)).toBe('13px')
  await expect(study).toHaveAttribute('data-variant', 'default')
  await expect(page.getByRole('button', { name: 'Pause memorization', exact: true })).toHaveAttribute('data-variant', 'outline')
})

test('new surfaces keep controls within small/medium/large windows across app zoom, themes and locales', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  await page.goto('/tests/fixtures/note-memory-layout.html')
  await page.waitForFunction(() => typeof window.setNoteLayoutCase === 'function')
  const issues: string[] = []
  const surfaces = ['panel', 'dashboard', 'conversion', 'recovery', 'source', 'tabs', 'study'] as const
  for (const surface of surfaces) for (const width of [480,768,1280]) for (const zoom of [100,125,150]) for (const theme of ['light','dark'] as const) for (const locale of ['en','vi','de-DE'] as const) {
    await page.setViewportSize({ width, height: 640 })
    await page.evaluate(({ surface, locale, theme, zoom }) => {
      document.documentElement.style.zoom = `${zoom}%`
      document.documentElement.style.setProperty('--tolaria-overlay-zoom-factor', String(zoom / 100))
      document.documentElement.style.setProperty('--tolaria-overlay-zoom-inverse', String(100 / zoom))
      window.setNoteLayoutCase?.({ surface, locale, theme })
    }, { surface, locale, theme, zoom })
    await page.waitForFunction(({ surface, locale, theme }) => document.documentElement.dataset.layoutCase === `${surface}:${locale}:${theme}`, { surface, locale, theme })
    await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))))
    if (surface === 'study') {
      await page.getByRole('button', { name: revealLabels[locale], exact: true }).click()
      await page.locator('.tl-container').waitFor({ state: 'visible' })
    }
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    const problem = await page.evaluate(() => {
      const viewport = innerWidth
      const dialogs = [...document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"][data-state="open"]')]
      const roots = dialogs.length ? dialogs : [...document.querySelectorAll<HTMLElement>('[data-layout-surface]')]
      const bad: string[] = []
      for (const root of roots) {
        const rectangle = root.getBoundingClientRect()
        if (rectangle.left < -1 || rectangle.right > viewport + 1) bad.push(`root:${Math.round(rectangle.left)}..${Math.round(rectangle.right)}`)
        if (dialogs.length && (rectangle.top < -1 || rectangle.bottom > innerHeight + 1)) bad.push(`vertical:${Math.round(rectangle.top)}..${Math.round(rectangle.bottom)}`)
        if (root.scrollWidth > root.clientWidth + 2) bad.push(`overflow:${root.scrollWidth}/${root.clientWidth}`)
        for (const element of root.querySelectorAll<HTMLElement>('[data-slot="button"],[data-slot="select-trigger"],[data-slot="input"]')) {
          if (!element.getClientRects().length || element.closest('[hidden],[inert]') || element.closest('.tl-container')) continue
          const rect = element.getBoundingClientRect()
          if (rect.left < -1 || rect.right > viewport + 1) bad.push(`control:${element.textContent?.trim().slice(0,30)}:${Math.round(rect.left)}..${Math.round(rect.right)}`)
        }
      }
      return bad.slice(0,5)
    })
    if (problem.length) issues.push(`${surface}/${width}/${zoom}/${theme}/${locale}: ${problem.join(';')}`)
    if (width === 480 && zoom === 150 && theme === 'dark' && locale === 'de-DE') await page.screenshot({ path: testInfo.outputPath(`${surface}-480-150-dark-de.png`) })
  }
  await testInfo.attach('layout-matrix', { body: JSON.stringify({ cases: surfaces.length * 54, issues }, null, 2), contentType: 'application/json' })
  expect(issues).toEqual([])
})

test('coarse targets, contrast, reduced motion and keyboard focus remain usable', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: { width: 480, height: 640 }, hasTouch: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  try {
    await page.goto('/tests/fixtures/note-memory-layout.html')
    await page.getByRole('button', { name: 'Study', exact: true }).waitFor()
    const metrics = []
    for (const theme of ['light','dark'] as const) {
      await page.evaluate(theme => window.setNoteLayoutCase?.({ surface: 'panel', locale: 'en', theme }), theme)
      await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme)
      metrics.push(await page.evaluate(() => {
        function rgba(color: string) { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; const painter = canvas.getContext('2d')!; painter.fillStyle = color; painter.fillRect(0,0,1,1); return [...painter.getImageData(0,0,1,1).data] }
        function luminance(color: number[]) { return color.slice(0,3).map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4 }).reduce((sum,value,index) => sum + value * [.2126,.7152,.0722][index],0) }
        function contrast(element: HTMLElement) { let background: HTMLElement | null = element; while (background && rgba(getComputedStyle(background).backgroundColor)[3] === 0) background = background.parentElement; const a = luminance(rgba(getComputedStyle(element).color)), b = luminance(rgba(getComputedStyle(background ?? document.body).backgroundColor)); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05) }
        const button = document.querySelector<HTMLElement>('[data-layout-surface] [data-variant="default"]')!, caption = document.querySelector<HTMLElement>('[data-layout-surface] .text-muted-foreground')!
        return { coarse: matchMedia('(pointer:coarse)').matches, controls: [...document.querySelectorAll<HTMLElement>('[data-layout-surface] [data-slot="button"]')].map(element => ({ name: element.textContent?.trim(), height: element.getBoundingClientRect().height, font: getComputedStyle(element).fontSize })), primaryContrast: contrast(button), captionContrast: contrast(caption) }
      }))
    }
    for (const metric of metrics) { expect(metric.coarse).toBe(true); expect(metric.primaryContrast).toBeGreaterThanOrEqual(4.5); expect(metric.captionContrast).toBeGreaterThanOrEqual(4.5); for (const control of metric.controls) { expect(control.height).toBeGreaterThanOrEqual(44); expect(control.font).toBe('13px') } }
    await page.evaluate(() => window.setNoteLayoutCase?.({ surface: 'tabs', locale: 'en', theme: 'light' }))
    await page.getByRole('tab', { name: 'Article', exact: true }).focus()
    await page.keyboard.press('ArrowRight')
    const mnemonic = page.getByRole('tab', { name: 'Mnemonic', exact: true })
    await expect(mnemonic).toHaveAttribute('aria-selected','true')
    await expect(mnemonic).toBeFocused()
    expect(await mnemonic.evaluate(element => ({ focus: element.matches(':focus-visible'), shadow: getComputedStyle(element).boxShadow }))).toMatchObject({ focus: true, shadow: expect.not.stringMatching(/^none$/) })
    await page.evaluate(() => window.setNoteLayoutCase?.({ surface: 'source', locale: 'en', theme: 'light' }))
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate(element => getComputedStyle(element).animationName)).toBe('none')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await testInfo.attach('coarse-contrast-focus', { body: JSON.stringify(metrics,null,2), contentType: 'application/json' })
  } finally { await context.close() }
})

test('editable canvas keeps its saved width through fullscreen and supports keyboard resizing and menu dismissal', async ({ page }) => {
  await page.goto('/tests/fixtures/note-memory-layout.html')
  await page.getByRole('button', { name: 'Study', exact: true }).waitFor()
  await page.evaluate(() => window.setNoteLayoutCase?.({ surface: 'whiteboard', locale: 'en', theme: 'light' }))
  const board = page.locator('.tldraw-whiteboard')
  await expect(board.locator('.tl-container')).toBeVisible()
  const width = await board.evaluate(element => element.getBoundingClientRect().width)
  const resize = page.getByRole('button', { name: 'Resize whiteboard width', exact: true })
  await resize.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => board.evaluate(element => element.getBoundingClientRect().width)).toBe(width + 8)
  const toggle = page.getByTestId('tldraw-whiteboard-fullscreen-toggle')
  await toggle.click()
  await expect(board).toHaveClass(/tldraw-whiteboard--fullscreen/)
  await expect(resize).toBeHidden()
  await toggle.click()
  await expect(board).not.toHaveClass(/tldraw-whiteboard--fullscreen/)
  expect(await board.evaluate(element => element.getBoundingClientRect().width)).toBe(width + 8)
  const vocabulary = page.getByRole('button', { name: 'Vocabulary image', exact: true })
  await vocabulary.click()
  await expect(page.getByRole('textbox', { name: 'Search vocabulary…', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(vocabulary).toBeFocused()
  await expect(page.getByRole('textbox', { name: 'Search vocabulary…', exact: true })).toBeHidden()
})
