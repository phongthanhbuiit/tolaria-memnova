import path from 'node:path'
import { expect, type Page, type Request } from '@playwright/test'

const fileIdleProbes = new WeakMap<Page, () => boolean>()

export async function routePerformanceFiles(page: Page) {
  const api = process.env.MEMNOVA_PERF_API_ORIGIN
  const requests: Record<string, number> = {}
  const pending = new Set<Request>(); let lastActivity = Date.now()
  const completed = (request: Request) => { if (pending.delete(request)) lastActivity = Date.now() }
  page.on('request', request => {
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/api/')) return
    pending.add(request); lastActivity = Date.now()
    requests[url.pathname] = (requests[url.pathname] ?? 0) + 1
  })
  page.on('requestfinished', completed); page.on('requestfailed', completed)
  fileIdleProbes.set(page, () => pending.size === 0 && Date.now() - lastActivity >= 1000)
  if (api) await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    const response = await route.fetch({ url: `${api}${url.pathname}${url.search}` })
    await route.fulfill({ response })
  })
  return requests
}

/** Browser transport for known local fixture images only; not native asset-protocol evidence. */
export async function installPerformanceImageTransport(page: Page) {
  await page.route('**/memnova-performance-images/*.png*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1) ?? ''
    if (!/^memory-[123]\.png$/.test(name)) return route.abort()
    await route.fulfill({ path: path.resolve('tests/fixtures/performance', name), contentType: 'image/png' })
  })
  await page.evaluate(() => {
    Object.defineProperty(globalThis, 'isTauri', { configurable: true, value: false })
    Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {
      convertFileSrc: (file: string) => `${location.origin}/memnova-performance-images/${file.split('/').at(-1)}`,
    } })
  })
}

export async function openPerformanceNote(page: Page, title: string) {
  await page.keyboard.press('Meta+o')
  const palette = page.getByTestId('quick-open-palette')
  await expect(palette).toBeVisible()
  await palette.getByPlaceholder('Search notes...').fill(title)
  await palette.getByRole('button').filter({ has: page.getByText(title, { exact: true }) }).click()
  await expect(palette).toBeHidden()
  await expect(page.locator('.bn-editor h1').first()).toHaveText(title)
}

export async function showPerformanceCanvas(page: Page) {
  await page.getByRole('tab', { name: 'Mnemonic', exact: true }).click()
  const board = page.locator('.tldraw-whiteboard')
  await expect(board.locator('.tl-container')).toBeVisible()
  await expect.poll(() => board.locator('img[src*="memnova-performance-images"]').evaluateAll(images => images.filter(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth === 320).length)).toBe(3)
  await board.scrollIntoViewIfNeeded()
  return board
}


export function performanceRequestCount(requests: Record<string, number>, endpoint: string) {
  return requests[endpoint] ?? 0
}

export function expectNoPerformanceCatalogReads(before: Record<string, number>, after: Record<string, number>) {
  for (const endpoint of ['/api/vault/list', '/api/vault/all-content']) {
    expect(performanceRequestCount(after, endpoint)).toBe(performanceRequestCount(before, endpoint))
  }
}


/** Exclude asynchronous Library startup work from per-input I/O measurements. */
export async function waitForPerformanceFilesIdle(page: Page) {
  const idle = fileIdleProbes.get(page)
  if (!idle) throw new Error('Missing performance file transport probe')
  await expect.poll(idle).toBe(true)
}
