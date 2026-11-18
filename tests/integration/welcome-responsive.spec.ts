import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const tauri = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')) as {
  app: { windows: { minWidth: number; minHeight: number }[] }
}
const windowOptions = tauri.app.windows[0]
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 700 },
  { width: windowOptions.minWidth, height: windowOptions.minHeight },
]

const locales = ['vi', 'en', 'ru-RU'] as const
const catalogs = Object.fromEntries(locales.map(locale => [
  locale, JSON.parse(readFileSync(`src/lib/locales/${locale}.json`, 'utf8')) as Record<string, string>,
]))
const themes = ['light', 'dark'] as const

for (const locale of locales) {
  for (const { width, height } of viewports) {
    for (const theme of themes) {
      test(`Welcome holds the ${locale} creation text at ${width}×${height} (${theme})`, async ({ page }, info) => {
        await page.setViewportSize({ width, height })
        await page.addInitScript(({ locale, theme }) => {
          type Handler = () => unknown
          const target = window as Window & { __mockHandlers?: Record<string, Handler> }
          localStorage.setItem('tolaria:ai-agents-onboarding-dismissed', '1')
          localStorage.setItem('tolaria:claude-code-onboarding-dismissed', '1')
          Object.defineProperty(target, '__mockHandlers', {
            configurable: true,
            set(handlers: Record<string, Handler>) {
              const getSettings = handlers.get_settings
              handlers.get_settings = () => ({
                ...getSettings() as Record<string, unknown>,
                ui_language: locale,
                theme_mode: theme,
                telemetry_consent: false,
                crash_reporting_enabled: false,
                analytics_enabled: false,
              })
              handlers.load_vault_list = () => ({ vaults: [], active_vault: null, hidden_defaults: [] })
              handlers.check_vault_exists = () => false
              Object.defineProperty(target, '__mockHandlers', { configurable: true, value: handlers, writable: true })
            },
          })
        }, { locale, theme })
        await page.goto('/')
        const create = page.getByTestId('welcome-create-new')
        const label = create.getByText(catalogs[locale]['welcome.create'], { exact: true })
        const description = create.getByText(catalogs[locale]['welcome.createHelp'], { exact: true })
        await expect(label).toBeVisible()
        await expect(description).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await page.evaluate(() => document.fonts.ready.then(() => undefined))
        const welcome = page.getByTestId('welcome-screen')
        await expect(create).toBeFocused()
        await create.scrollIntoViewIfNeeded()
        await expect(create).toBeInViewport({ ratio: 1 })
        const matches = await create.evaluate((button) => {
          const bounds = button.getBoundingClientRect()
          const paragraphs = [...button.querySelectorAll('p')].map((text) => {
            const range = document.createRange()
            range.selectNodeContents(text)
            const lines = [...range.getClientRects()]
            return {
              lineCount: new Set(lines.map(line => line.top)).size,
              overflow: Math.max(0, ...lines.map(line => Math.max(
                bounds.left - line.left,
                line.right - bounds.right,
                bounds.top - line.top,
                line.bottom - bounds.bottom,
              ))),
            }
          })
          return { paragraphs }
        })
        await page.screenshot({ path: info.outputPath('welcome.png') })
        await info.attach('text-measurements', { body: JSON.stringify(matches), contentType: 'application/json' })
        expect(matches.paragraphs).toHaveLength(2)
        expect(matches.paragraphs.every(({ overflow }) => overflow <= 1), JSON.stringify(matches)).toBe(true)
        if (locale === 'vi' || width === windowOptions.minWidth) {
          expect(matches.paragraphs[1].lineCount).toBeGreaterThan(1)
        }
        const horizontalOverflow = await welcome.evaluate(element => element.scrollWidth - element.clientWidth)
        expect(horizontalOverflow).toBeLessThanOrEqual(1)
      })
    }
  }
}
