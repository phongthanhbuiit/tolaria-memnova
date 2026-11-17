// Renderer-only acceptance checks. Scheduling/persistence use the existing suites.
async (page) => {
  const results = []
  for (const theme of ['light', 'dark']) {
    for (const width of [480, 519, 520, 1100]) {
      for (const content of ['short', 'long']) {
        await page.setViewportSize({ width, height: 800 })
        await page.goto(`http://localhost:5201/docs/audits/evidence/study.html?theme=${theme}&title=long&content=${content}`)
        await page.getByRole('button', { name: 'Xem gợi nhớ', exact: true }).click()
        await page.waitForFunction(() => document.querySelector('[data-note-grade="3"]')?.disabled === false)
        const metrics = await page.evaluate(() => {
          const dialog = document.querySelector('.learning-study-dialog')
          const title = dialog.querySelector('[data-slot="dialog-title"]')
          const body = dialog.querySelector('.learning-study-body')
          const footer = dialog.querySelector('.learning-study-footer')
          const grades = [...dialog.querySelectorAll('[data-note-grade]')]
          const copy = [...dialog.querySelectorAll('.bn-inline-content')].find(el => el.getBoundingClientRect().height > 0)
          return {
            width: dialog.getBoundingClientRect().width,
            titleLength: title.textContent.length,
            titleHeight: title.getBoundingClientRect().height,
            titleSize: getComputedStyle(title).fontSize,
            headerHeight: dialog.querySelector('.learning-study-header').getBoundingClientRect().height,
            progressHeight: dialog.querySelector('[role="progressbar"]').getBoundingClientRect().height,
            copySize: getComputedStyle(copy).fontSize,
            copyLine: getComputedStyle(copy).lineHeight,
            alignment: [title, copy, grades[0]].map(el => el.getBoundingClientRect().left),
            columns: getComputedStyle(dialog.querySelector('.study-grade-grid')).gridTemplateColumns.split(' ').length,
            grades: grades.map(el => ({ height: el.getBoundingClientRect().height, border: getComputedStyle(el).borderTopWidth })),
            scrolls: body.scrollHeight > body.clientHeight,
            footerTop: footer.getBoundingClientRect().top,
            headerTop: dialog.querySelector('.learning-study-header').getBoundingClientRect().top,
          }
        })
        if (Math.abs(metrics.width - Math.min(640, width - 32)) > 1) throw Error(`Dialog width: ${JSON.stringify(metrics)}`)
        if (metrics.titleLength !== 200 || metrics.titleHeight > 25 || metrics.titleSize !== '16px') throw Error('Title truncation')
        if (metrics.headerHeight !== 56 || metrics.progressHeight !== 2) throw Error('Header geometry')
        if (metrics.copySize !== '18px' || metrics.copyLine !== '28px') throw Error('Recall typography')
        if (Math.max(...metrics.alignment) - Math.min(...metrics.alignment) > 1) throw Error(`Alignment: ${JSON.stringify(metrics.alignment)}`)
        if (metrics.columns !== (width < 520 ? 2 : 4)) throw Error('Grade columns')
        if (metrics.grades.some(grade => grade.height !== 56 || grade.border !== '1px')) throw Error(`Grade geometry: ${JSON.stringify(metrics.grades)}`)
        if (content === 'long' && !metrics.scrolls) throw Error('Long content did not scroll')
        await page.locator('.learning-study-body').evaluate(el => { el.scrollTop = el.scrollHeight })
        const stable = await page.evaluate(() => ({ header: document.querySelector('.learning-study-header').getBoundingClientRect().top, footer: document.querySelector('.learning-study-footer').getBoundingClientRect().top }))
        if (stable.header !== metrics.headerTop || stable.footer !== metrics.footerTop) throw Error('Header/footer moved while scrolling')
        if (width === 1100) await page.screenshot({ path: `docs/audits/evidence/step-B-${theme}-${content}-after.png` })
        results.push({ theme, viewport: width, content, ...metrics })
      }
    }
    for (const state of ['completed', 'waiting']) {
      await page.goto(`http://localhost:5201/docs/audits/evidence/study.html?theme=${theme}&state=${state}`)
      await page.getByRole('button', { name: 'Đóng', exact: true }).waitFor()
      if (await page.getByRole('button', { name: 'Đóng', exact: true }).count() !== 1) throw Error('Duplicate terminal close')
      const size = await page.locator('.learning-study-terminal h2').evaluate(el => getComputedStyle(el).fontSize)
      if (size !== '20px') throw Error('Terminal type scale')
      await page.screenshot({ path: `docs/audits/evidence/step-B-${theme}-${state}-after.png` })
      await page.keyboard.press('Escape')
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
    }
  }
  for (const key of ['1', '2', '3', '4']) {
    await page.goto('http://localhost:5201/docs/audits/evidence/study.html?locale=en')
    await page.getByRole('button', { name: 'Show mnemonic', exact: true }).waitFor()
    await page.waitForFunction(() => document.querySelector('.study-reveal-action')?.disabled === false)
    await page.keyboard.press('Space')
    await page.waitForFunction(() => document.querySelector('[data-note-grade="3"]')?.disabled === false)
    await page.keyboard.press(key)
    await page.getByRole('heading', { name: 'Done', exact: true }).waitFor()
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('http://localhost:5201/docs/audits/evidence/study.html?locale=en')
  const animation = await page.getByRole('dialog').evaluate(el => getComputedStyle(el).animationName)
  if (animation !== 'none') throw Error('Reduced motion')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  return { cases: results, shortcuts: 'Space, 1–4, Esc passed', reducedMotion: 'passed' }
}
