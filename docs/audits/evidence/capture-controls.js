async (page) => {
  await page.setViewportSize({width:1100,height:800})
  await page.goto('http://localhost:5201/tests/fixtures/note-memory-layout.html')
  await page.waitForFunction(() => typeof window.setNoteLayoutCase === 'function')
  for (const theme of ['light','dark']) for (const surface of ['panel','conversion','recovery','source','toolbar','inspector','dashboard','tabs']) {
    await page.evaluate(({theme,surface}) => window.setNoteLayoutCase({surface,theme,locale:'vi'}),{theme,surface})
    await page.waitForFunction(({theme,surface}) => document.documentElement.dataset.layoutCase === `${surface}:vi:${theme}`,{theme,surface})
    await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))))
    await page.screenshot({path:`docs/audits/evidence/step-C-${theme}-${surface}-after.png`})
  }
  return 'Captured 16 final surfaces'
}
