import type { CDPSession, Page } from '@playwright/test'

declare global { interface Window { __memnovaPerformanceResources?: () => { timeouts: number; intervals: number; objectUrls: number } } }

/** Test-only handle accounting. Chromium supplies actual DOM/listener/heap counters separately. */
export async function installPerformanceResourceProbe(page: Page) {
  await page.addInitScript(() => {
    const timeouts = new Set<number>(), intervals = new Set<number>(), urls = new Set<string>()
    const timeout = window.setTimeout.bind(window), clearTimeout = window.clearTimeout.bind(window)
    const interval = window.setInterval.bind(window), clearInterval = window.clearInterval.bind(window)
    window.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
      if (typeof callback !== 'function') return timeout(callback, delay, ...args)
      const id = timeout(() => { timeouts.delete(id); Reflect.apply(callback, window, args) }, delay)
      timeouts.add(id)
      return id
    }) as typeof window.setTimeout
    window.clearTimeout = id => { timeouts.delete(id ?? 0); clearTimeout(id) }
    window.setInterval = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
      const id = interval(callback, delay, ...args); intervals.add(id); return id
    }) as typeof window.setInterval
    window.clearInterval = id => { intervals.delete(id ?? 0); clearInterval(id) }
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = blob => { const url = create(blob); urls.add(url); return url }
    URL.revokeObjectURL = url => { urls.delete(url); revoke(url) }
    window.__memnovaPerformanceResources = () => ({ timeouts: timeouts.size, intervals: intervals.size, objectUrls: urls.size })
  })
}

export async function performanceResources(page: Page, session: CDPSession) {
  await session.send('HeapProfiler.collectGarbage')
  await session.send('HeapProfiler.collectGarbage')
  const dom = await session.send('Memory.getDOMCounters')
  const heap = await session.send('Runtime.getHeapUsage')
  const handles = await page.evaluate(() => window.__memnovaPerformanceResources?.())
  if (!handles) throw new Error('Missing performance resource probe')
  const globalListeners: Record<string, number> = {}
  for (const expression of ['window', 'document', 'document.body']) {
    const { result } = await session.send('Runtime.evaluate', { expression })
    if (!result.objectId) throw new Error('Missing resource target')
    const { listeners } = await session.send('DOMDebugger.getEventListeners', { objectId: result.objectId })
    globalListeners[expression] = listeners.length
    await session.send('Runtime.releaseObject', { objectId: result.objectId })
  }
  const visible = await page.evaluate(() => ({ liveElements: document.querySelectorAll('*').length, liveCanvases: document.querySelectorAll('.tl-container').length }))
  return { ...dom, ...handles, ...visible, globalListeners, heapBytes: heap.usedSize }
}
