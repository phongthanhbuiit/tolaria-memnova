// Run via playwright-cli run-code with the Vite server on port 5201.
async (page) => {
  const results = []
  for (const theme of ['light', 'dark']) {
    await page.goto(`http://localhost:5201/docs/audits/evidence/foundation.html?theme=${theme}`)
    await page.getByRole('heading', { name: 'Điều khiển', exact: true }).waitFor()
    const measurements = await page.evaluate(() => {
      const types = Array.from(document.querySelectorAll('[data-type]'), el => {
        const css = getComputedStyle(el)
        return { token: el.dataset.type, size: parseFloat(css.fontSize), line: parseFloat(css.lineHeight), weight: Number(css.fontWeight) }
      })
      const controls = Array.from(document.querySelectorAll('[data-control]'), el => ({ id: el.dataset.control, height: el.getBoundingClientRect().height, radius: getComputedStyle(el).borderRadius }))
      const luminance = rgb => rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
      const probe = document.createElement('span')
      document.body.append(probe)
      const contrasts = []
      for (const text of ['primary', 'secondary', 'muted']) {
        for (const surface of ['app', 'sidebar', 'panel', 'card', 'popover', 'input', 'button', 'dialog']) {
          probe.style.color = `var(--text-${text})`
          probe.style.backgroundColor = `var(--surface-${surface})`
          const css = getComputedStyle(probe)
          const a = luminance(css.color), b = luminance(css.backgroundColor)
          contrasts.push({ text, surface, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) })
        }
      }
      probe.remove()
      return { types, controls, contrasts, badgeRadius: getComputedStyle(document.querySelector('[data-slot="badge"]')).borderRadius, cardRadius: getComputedStyle(document.querySelector('[data-slot="card"]')).borderRadius }
    })
    const expected = [[11, 16, 500], [12, 18, 400], [13, 20, 400], [14, 22, 400], [16, 24, 600], [20, 28, 600], [18, 28, 400]]
    measurements.types.forEach((type, i) => {
      if (JSON.stringify([type.size, type.line, type.weight]) !== JSON.stringify(expected[i])) throw new Error(`Type mismatch: ${JSON.stringify(type)}`)
    })
    measurements.controls.forEach(control => {
      const size = control.id.split('-').at(-1)
      if (control.height !== { sm: 28, md: 32, lg: 36 }[size] || control.radius !== '6px') throw new Error(`Control mismatch: ${JSON.stringify(control)}`)
    })
    if (measurements.contrasts.some(c => c.ratio < 4.5)) throw new Error(`Contrast failed: ${JSON.stringify(measurements.contrasts)}`)
    if (measurements.badgeRadius !== '4px' || measurements.cardRadius !== '8px') throw new Error('Surface radii mismatch')
    await page.screenshot({ path: `docs/audits/evidence/step-A-${theme}-after.png` })
    await page.getByRole('button', { name: 'Mở dialog', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    const dialogRadius = await page.getByRole('dialog').evaluate(el => getComputedStyle(el).borderRadius)
    if (dialogRadius !== '12px') throw new Error(`Dialog radius ${dialogRadius}`)
    await page.keyboard.press('Escape')
    if (!await page.getByRole('button', { name: 'Mở dialog', exact: true }).evaluate(el => el === document.activeElement)) throw new Error('Dialog focus did not return')
    await page.getByRole('combobox', { name: 'Select md', exact: true }).click()
    await page.getByRole('option', { name: 'Gợi nhớ', exact: true }).click()
    await page.getByRole('combobox', { name: 'Select md', exact: true }).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Enter')
    const spacing = await page.addStyleTag({ content: '[data-control] { font-size: 26px; line-height: 1.5; letter-spacing: .12em; word-spacing: .16em; }' })
    const overflow = await page.locator('[data-control]').evaluateAll(els => els.some(el => el.scrollHeight > el.clientHeight))
    if (overflow) throw new Error('Controls clip enlarged, spaced text')
    await spacing.evaluate(el => el.remove())
    results.push({ theme, ...measurements, dialogRadius, textSpacing: 'pass', mouseAndKeyboard: 'pass' })
  }
  return results
}
