import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium, webkit } = createRequire(process.cwd() + '/package.json')('@playwright/test')
const cases=[]
for (const [engine, launcher] of Object.entries({chromium,webkit})) {
  const browser=await launcher.launch()
  try {
    const page=await browser.newPage()
    await page.goto('http://localhost:5201/tests/fixtures/note-memory-layout.html')
    await page.waitForFunction(()=>typeof window.setNoteLayoutCase==='function')
    for (const width of [1024,1440]) for(const locale of ['en','vi']) for(const theme of ['light','dark']) {
      await page.setViewportSize({width,height:700})
      await page.evaluate(v=>window.setNoteLayoutCase(v),{surface:'dashboard',locale,theme})
      await page.waitForFunction(v=>document.documentElement.dataset.layoutCase===`dashboard:${v.locale}:${v.theme}`,{locale,theme})
      await page.locator('.note-memory-status').waitFor()
      const metric=await page.evaluate(()=>{
        const badge=document.querySelector('.note-memory-list .note-memory-status')
        const root=document.querySelector('.note-memory-surface')
        const heading=root.querySelector('h1,h2')
        const label=root.querySelector('label')
        const tabs=[...root.querySelectorAll('[role=tab]')].map(t=>({selected:t.getAttribute('aria-selected'),underline:getComputedStyle(t,'::after').borderBottomStyle,width:getComputedStyle(t,'::after').borderBottomWidth}))
        const css=getComputedStyle(badge)
        return {badge:{height:badge.getBoundingClientRect().height,radius:css.borderRadius,font:css.fontSize,line:css.lineHeight},heading:getComputedStyle(heading).fontSize,label:getComputedStyle(label).fontSize,overflow:root.scrollWidth>root.clientWidth+1,tabs}
      })
      assert.equal(metric.badge.height,22)
      assert.equal(metric.badge.radius,'4px')
      assert.equal(metric.badge.font,'12px')
      assert.equal(metric.label,'12px')
      assert.equal(metric.heading,'16px')
      assert.equal(metric.overflow,false)
      assert.equal(metric.tabs.find(t=>t.selected==='true').underline,'solid')
      cases.push({engine,width,locale,theme,...metric})
    }
    const first=page.getByRole('tab').first(),second=page.getByRole('tab').nth(1)
    await second.click();await assert.equal(await second.getAttribute('aria-selected'),'true')
    await page.keyboard.press('ArrowLeft');assert.equal(await first.getAttribute('aria-selected'),'false')
    await page.keyboard.press('Enter');assert.equal(await first.getAttribute('aria-selected'),'true')
    if(engine==='chromium'){
      await page.emulateMedia({forcedColors:'active'})
      const style=await first.evaluate(t=>({border:getComputedStyle(t,'::after').borderBottomStyle,width:getComputedStyle(t,'::after').borderBottomWidth}))
      assert.equal(style.border,'solid');assert.notEqual(style.width,'0px')
    }
  } finally {await browser.close()}
}
await fs.writeFile(process.env.D2_METRICS_OUTPUT || '/tmp/memnova-d2-browser-metrics.json',JSON.stringify({cases,keyboard:'manual activation passed in both engines',forcedColors:'Chromium border underline visible'},null,2)+'\n')
console.log(`${cases.length} layout/token cases passed`)
