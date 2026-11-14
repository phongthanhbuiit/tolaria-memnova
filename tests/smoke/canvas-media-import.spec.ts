import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVaultDesktopHarness, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { triggerMenuCommand } from './testBridge'

// Actual excalidraw DOM input + browser file adapter; native picker/bytes are checked separately.
test('Excalidraw image picker embeds the selected file in the Markdown scene',async({page})=>{
  test.setTimeout(60_000)
  const root=createFixtureVaultCopy(), note=path.join(root,'note/note-b.md'), image=path.join(root,'qa-image.png')
  try {
    fs.writeFileSync(note,'---\nIs A: Note\nStatus: Active\n---\n# Note B\n\n```excalidraw id="import-test" height="520"\n{}\n```\n')
    await page.addInitScript(() => { Reflect.deleteProperty(window, 'showOpenFilePicker') })
    await openFixtureVaultDesktopHarness(page,root)
    await page.evaluate(()=>Object.defineProperty(globalThis,'isTauri',{configurable:true,value:false}))
    await page.getByText('Note B',{exact:true}).first().click()
    const board=page.locator('.excalidraw-whiteboard'), canvas=board.locator('canvas.interactive')
    await expect(canvas).toBeVisible()
    const png=await page.evaluate(()=>{
      const image=document.createElement('canvas');image.width=64;image.height=40
      const context=image.getContext('2d')!;context.fillStyle='#155dff';context.fillRect(0,0,64,40)
      return image.toDataURL('image/png').split(',')[1]
    })
    fs.writeFileSync(image,Buffer.from(png,'base64'))
    const chooser=page.waitForEvent('filechooser')
    await board.getByTestId('toolbar-image').locator('..').click()
    await(await chooser).setFiles(image)
    await canvas.click({position:{x:80,y:180}})
    await triggerMenuCommand(page,'file-save')
    await expect.poll(()=>{
      const source=fs.readFileSync(note,'utf8'),match=source.match(/```excalidraw[^\n]*\n([\s\S]*?)\n```/)
      if(!match)return 0
      const scene=JSON.parse(match[1])
      const element=scene.elements?.find((item: {type:string})=>item.type==='image')
      return element && scene.files[element.fileId]?.dataURL
    },{timeout:12000}).toBe('data:image/png;base64,'+png)
  } finally {removeFixtureVaultCopy(root)}
})
