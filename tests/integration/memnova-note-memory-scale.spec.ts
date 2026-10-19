import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { expect, test } from '@playwright/test'
import { createNoteMemoryFixture } from '../helpers/noteMemoryFixture'
import { openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { createPerformanceLibrary, performanceShapeCount } from '../helpers/noteMemoryPerformanceFixture'
import { expectNoPerformanceCatalogReads, installPerformanceImageTransport, openPerformanceNote, performanceRequestCount, routePerformanceFiles, showPerformanceCanvas, waitForPerformanceFilesIdle } from '../helpers/noteMemoryPerformanceBrowser'
import { installPerformanceResourceProbe, performanceResources } from '../helpers/noteMemoryResourceProbe'

test.use({ actionTimeout: 15_000, viewport: { width: 1400, height: 1000 } })
const p95 = (values: number[]) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * .95) - 1]

for (const shapeCount of [100, 1000] as const) {
  test(`A4 and three local images with ${shapeCount} initial canvas shapes: twenty measurements`, async ({ page }, info) => {
    test.setTimeout(180_000)
    const fixture = createPerformanceLibrary(), file = fixture.boardFile(shapeCount)
    const requests = await routePerformanceFiles(page)
    const samples: Array<{ openMs: number; saveMs: number }> = []
    try {
      await openFixtureVault(page, fixture.root)
      await installPerformanceImageTransport(page)
      for (let index = 0; index < 23; index++) {
        await openPerformanceNote(page, 'Source note')
        const opened = performance.now()
        await openPerformanceNote(page, `Canvas ${shapeCount}`)
        const board = await showPerformanceCanvas(page)
        const openMs = performance.now() - opened
        const before = performanceShapeCount(file)
        await page.getByTestId('tools.draw').click()
        const box = (await board.boundingBox())!
        await page.mouse.move(box.x + 180, box.y + 180); await page.mouse.down()
        await page.mouse.move(box.x + 220, box.y + 205, { steps: 3 }); await page.mouse.up()
        const saving = performance.now()
        await page.keyboard.press('Meta+s')
        await expect.poll(() => performanceShapeCount(file), { intervals: [10, 20, 50] }).toBe(before + 1)
        if (index >= 3) samples.push({ openMs, saveMs: performance.now() - saving })
        if (index === 22) await page.screenshot({ path: info.outputPath('canvas-final.png') })
      }
      const report = { mode: process.env.MEMNOVA_PERF_API_ORIGIN ? 'production-renderer-dev-file-api' : 'development-renderer', cpu: os.cpus()[0]?.model, platform: `${os.platform()} ${os.arch()}`, syntheticNotes: fixture.syntheticNotes, totalMarkdownFiles: fixture.totalMarkdownFiles, enabledNotes: fixture.enabledNotes, images: fixture.images, initialShapes: shapeCount, finalShapes: performanceShapeCount(file), initialSnapshotBytes: fixture.snapshots[shapeCount], finalNoteBytes: fs.statSync(file).size, warmups: 3, samples, p95: { openMs: p95(samples.map(s => s.openMs)), saveMs: p95(samples.map(s => s.saveMs)) }, requests }
      fs.writeFileSync(info.outputPath('scale-performance.json'), JSON.stringify(report, null, 2))
      await info.attach('scale-performance', { body: JSON.stringify(report), contentType: 'application/json' })
    } finally { await page.unrouteAll({ behavior: 'wait' }); removeFixtureVaultCopy(fixture.root) }
  })
}

test('twenty note and twenty Library transitions release canvas resources without background writes', async ({ page }, info) => {
  test.setTimeout(180_000)
  const fixture = createPerformanceLibrary(), second = createNoteMemoryFixture()
  const secondary = path.join(second, 'memory-fixtures/source.md')
  fs.writeFileSync(secondary, '# Secondary source\n\nThe second disposable Library.\n')
  await installPerformanceResourceProbe(page)
  const requests = await routePerformanceFiles(page), session = await page.context().newCDPSession(page)
  try {
    await openFixtureVault(page, fixture.root)
    await installPerformanceImageTransport(page)
    const firstLabel = (await page.getByTestId('status-vault-trigger').innerText()).trim()
    await page.evaluate(roots => {
      const handlers = { ...window.__mockHandlers, check_vault_exists: (args?: Record<string, unknown>) => roots.includes(String(args?.path)) }
      Object.defineProperty(window, '__mockHandlers', { configurable: true, value: handlers })
    }, [fixture.root, second])
    page.once('dialog', dialog => { void dialog.accept(second) })
    await page.getByRole('button', { name: 'Open existing Library', exact: true }).click()
    await page.getByRole('button', { name: 'Open local folder', exact: true }).click()
    await expect(page.getByTestId('note-list-container').getByText('Secondary source', { exact: true })).toBeVisible()
    const secondLabel = (await page.getByTestId('status-vault-trigger').innerText()).trim()
    async function switchLibrary(label: string, title: string) {
      await page.getByTestId('status-vault-trigger').click()
      await page.getByTestId(`vault-menu-item-label-${label}`).click()
      await expect(page.getByTestId('note-list-container').getByText(title, { exact: true })).toBeVisible()
      await openPerformanceNote(page, title)
    }
    async function resourcesAtRest() {
      await expect(page.getByTestId('quick-open-palette')).toHaveCount(0)
      await waitForPerformanceFilesIdle(page)
      await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))))
      await expect.poll(async () => (await performanceResources(page, session)).objectUrls, { timeout: 10_000 }).toBe(0)
      return performanceResources(page, session)
    }
    // Prime both Library/editor paths before comparing the same ordinary-note resting state.
    for (let index = 0; index < 2; index++) {
      await switchLibrary(secondLabel, 'Secondary source')
      await switchLibrary(firstLabel, 'Source note')
      await openPerformanceNote(page, 'Canvas 1000'); await showPerformanceCanvas(page)
      await openPerformanceNote(page, 'Source note')
    }
    const before = await resourcesAtRest(), reads = { ...requests }
    const snapshots: typeof before[] = []
    for (let index = 0; index < 20; index++) {
      await openPerformanceNote(page, `Performance note ${String(100 + index).padStart(4, '0')}`)
      await openPerformanceNote(page, 'Canvas 1000'); await showPerformanceCanvas(page)
      await openPerformanceNote(page, 'Source note')
      if (index % 5 === 4) {
        snapshots.push(await performanceResources(page, session))
        fs.writeFileSync(info.outputPath('resource-progress.json'), JSON.stringify({ before, checkpoints: snapshots }, null, 2))
      }
    }
    for (let index = 0; index < 20; index++) {
      await switchLibrary(index % 2 ? firstLabel : secondLabel, index % 2 ? 'Source note' : 'Secondary source')
      if (index % 2) { await openPerformanceNote(page, 'Canvas 1000'); await showPerformanceCanvas(page); await openPerformanceNote(page, 'Source note') }
      if (index % 5 === 4) {
        snapshots.push(await performanceResources(page, session))
        fs.writeFileSync(info.outputPath('resource-progress.json'), JSON.stringify({ before, checkpoints: snapshots }, null, 2))
      }
    }
    await expect.poll(async () => (await performanceResources(page, session)).timeouts).toBeLessThanOrEqual(before.timeouts)
    const after = await resourcesAtRest()
    const report = { before, checkpoints: snapshots, after, requests, noteTransitions: 20, libraryTransitions: 20, warmupLibraryCycles: 2, caveat: 'Chromium renderer/file-API test; heap bytes reported, not an assertion of native/WebKit heap parity.' }
    fs.writeFileSync(info.outputPath('resource-performance.json'), JSON.stringify(report, null, 2))
    expect(after.objectUrls).toBe(before.objectUrls)
    expect(after.intervals).toBeLessThanOrEqual(before.intervals)
    expect(after.timeouts).toBeLessThanOrEqual(before.timeouts)
    expect(after.documents).toBeLessThanOrEqual(before.documents)
    expect(after.jsEventListeners).toBeLessThanOrEqual(before.jsEventListeners)
    expect((requests['/api/vault/save'] ?? 0) - (reads['/api/vault/save'] ?? 0)).toBe(0)
  } finally { await page.unrouteAll({ behavior: 'wait' }); await session.detach(); removeFixtureVaultCopy(fixture.root); removeFixtureVaultCopy(second) }
})


test('pointer navigation and typing do not write or rescan the Library on each input', async ({ page }, info) => {
  const fixture = createPerformanceLibrary()
  const requests = await routePerformanceFiles(page)
  try {
    await openFixtureVault(page, fixture.root)
    await installPerformanceImageTransport(page)
    await openPerformanceNote(page, 'Canvas 1000')
    const board = await showPerformanceCanvas(page)
    const file = fixture.boardFile(1000), original = fs.readFileSync(file)
    await waitForPerformanceFilesIdle(page)
    const beforePan = { ...requests }
    await page.getByTestId('tools.hand').click()
    const box = (await board.boundingBox())!
    for (let index = 0; index < 20; index++) {
      await page.mouse.move(box.x + 250, box.y + 200); await page.mouse.down()
      await page.mouse.move(box.x + 260, box.y + 210, { steps: 3 }); await page.mouse.up()
    }
    const afterPan = { ...requests }
    expect(performanceRequestCount(afterPan, '/api/vault/save')).toBe(performanceRequestCount(beforePan, '/api/vault/save'))
    expect(fs.readFileSync(file).equals(original)).toBe(true)
    expectNoPerformanceCatalogReads(beforePan, afterPan)
    await page.keyboard.press('Meta+s')
    await openPerformanceNote(page, 'Source note')
    const paragraph = page.locator('.bn-editor [data-content-type="paragraph"]').last()
    await paragraph.click(); await page.keyboard.press('Meta+ArrowRight')
    expect(fs.readFileSync(file).equals(original)).toBe(true)
    await waitForPerformanceFilesIdle(page)
    const beforeTyping = { ...requests }
    await page.keyboard.type('abcdefghijklmnopqrst', { delay: 5 })
    expectNoPerformanceCatalogReads(beforeTyping, requests)
    await page.keyboard.press('Meta+s')
    const source = path.join(fixture.root, 'memory-fixtures/source.md')
    await expect.poll(() => fs.readFileSync(source, 'utf8')).toContain('abcdefghijklmnopqrst')
    expect(performanceRequestCount(requests, '/api/vault/save') - performanceRequestCount(beforeTyping, '/api/vault/save')).toBe(1)
    expect(performanceRequestCount(requests, '/api/vault/all-content') - performanceRequestCount(beforeTyping, '/api/vault/all-content')).toBeLessThanOrEqual(1)
    fs.writeFileSync(info.outputPath('input-io.json'), JSON.stringify({ beforePan, afterPan, beforeTyping, after: requests, pans: 20, keystrokes: 20 }, null, 2))
  } finally { await page.unrouteAll({ behavior: 'wait' }); removeFixtureVaultCopy(fixture.root) }
})
