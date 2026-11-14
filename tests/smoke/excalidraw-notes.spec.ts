import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'

test('draws a rectangle, saves the scene to Markdown and reopens it', async ({page}) => {
  test.setTimeout(90000)
  const root = createFixtureVaultCopy()
  try {
    const file = path.join(root,'note','drawing.md')
    fs.writeFileSync(file, '# Drawing\n\n```excalidraw\n{}\n```\n')
    await openFixtureVault(page,root)
    const open = async () => page.getByTestId('note-list-container').getByText('Drawing',{exact:true}).click()
    await open()
    const rect = page.getByTestId('toolbar-rectangle')
    await rect.locator('..').click()
    const canvas = page.locator('.excalidraw canvas.interactive')
    const box = await canvas.boundingBox()
    if (!box) throw Error('Missing drawing surface')
    await page.mouse.move(box.x+80,box.y+180)
    await page.mouse.down()
    await page.mouse.move(box.x+150,box.y+225,{steps:8})
    await page.mouse.up()
    await page.keyboard.press('ControlOrMeta+s')
    await expect.poll(()=>fs.readFileSync(file,'utf8')).toContain('"type":"rectangle"')
    await page.reload()
    await open()
    await expect(canvas).toBeVisible()
    expect(fs.readFileSync(file,'utf8')).toContain('"type":"rectangle"')
  } finally { removeFixtureVaultCopy(root) }
})
