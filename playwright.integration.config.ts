import { defineConfig } from '@playwright/test'

const browserName = process.env.MEMNOVA_PLAYWRIGHT_WEBKIT === '1' ? 'webkit' : 'chromium'

export default defineConfig({
  testDir: './tests/integration',
  timeout: 30_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5365',
    headless: true,
  },
  projects: [{ name: browserName, use: { browserName } }],
  webServer: {
    command: `pnpm dev --port ${process.env.BASE_URL?.match(/:(\d+)/)?.[1] || '5365'}`,
    url: process.env.BASE_URL || 'http://localhost:5365',
    reuseExistingServer: true,
  },
})
