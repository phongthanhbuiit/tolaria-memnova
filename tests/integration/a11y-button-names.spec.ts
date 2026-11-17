import { expect, test } from '@playwright/test'

const surfaces = ['panel', 'dashboard', 'conversion', 'recovery', 'source', 'tabs', 'study', 'toolbar'] as const
for (const surface of surfaces) for (const locale of ['en', 'vi'] as const) {
  test(`${surface}/${locale}: rendered buttons expose accessible names`, async ({ page }) => {
    await page.goto('/tests/fixtures/note-memory-layout.html')
    await page.waitForFunction(() => typeof window.setNoteLayoutCase === 'function')
    await page.evaluate(({ surface, locale }) => window.setNoteLayoutCase?.({ surface, locale, theme: 'light' }), { surface, locale })
    await page.waitForFunction(({ surface, locale }) => document.documentElement.dataset.layoutCase === `${surface}:${locale}:light`, { surface, locale })
    expect(await page.getByRole('button').count()).toBeGreaterThan(0)
    await expect(page.getByRole('button', { name: /^$/ })).toHaveCount(0)
  })
}
