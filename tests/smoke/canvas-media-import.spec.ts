import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVaultDesktopHarness, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { triggerMenuCommand } from './testBridge'

// Actual tldraw DOM input + browser file adapter; native picker/bytes are checked separately.
test('canvas picker, clipboard-event fallback and drop serialize durable image sources',async({page})=>{
  test.setTimeout(60_000)
  const root=createFixtureVaultCopy(), note=path.join(root,'note/note-b.md'), image=path.join(root,'qa-image.png')
  try {
    fs.writeFileSync(note,'---\nIs A: Note\nStatus: Active\n---\n# Note B\n\n```tldraw id="import-test" height="520"\n{}\n```\n')
    await openFixtureVaultDesktopHarness(page,root)
    await page.evaluate(()=>Object.defineProperty(globalThis,'isTauri',{configurable:true,value:false}))
    await page.getByText('Note B',{exact:true}).first().click()
    const board=page.locator('.tldraw-whiteboard'), canvas=board.locator('.tl-canvas')
    await expect(canvas).toBeVisible()
    const png=await page.evaluate(()=>{
      const image=document.createElement('canvas');image.width=64;image.height=40
      const context=image.getContext('2d')!;context.fillStyle='#155dff';context.fillRect(0,0,64,40)
      return image.toDataURL('image/png').split(',')[1]
    })
    fs.writeFileSync(image,Buffer.from(png,'base64'))
    // Exercise the event-data fallback without reading or modifying the system clipboard.
    await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'read',{configurable:true,value:async()=>{throw new DOMException('Denied in isolated test','NotAllowedError')}}))
    const chooser=page.waitForEvent('filechooser')
    await board.getByRole('button',{name:/^Media/}).click()
    await(await chooser).setFiles(image)
    const shapes=board.locator('[data-shape-type="image"]')
    await expect(shapes).toHaveCount(1)
    for(const [event,count] of [['paste',2],['drop',3]] as const){
      await canvas.click({position:{x:80,y:80}})
      const transfer=await page.evaluateHandle(encoded=>{
        const bytes=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0)),data=new DataTransfer()
        data.items.add(new File([bytes],'memory.png',{type:'image/png'}));return data
      },png)
      const box=await canvas.boundingBox();expect(box).not.toBeNull()
      await canvas.evaluate((element,{event,transfer,x,y})=>element.dispatchEvent(event==='paste' ? new ClipboardEvent('paste',{clipboardData:transfer,bubbles:true,cancelable:true}) : new DragEvent('drop',{dataTransfer:transfer,clientX:x,clientY:y,bubbles:true,cancelable:true})),{event,transfer,x:box!.x+80,y:box!.y+80})
      await transfer.dispose()
      await expect(shapes).toHaveCount(count)
    }
    await triggerMenuCommand(page,'file-save')
    await expect.poll(()=>{
      const source=fs.readFileSync(note,'utf8'),match=source.match(/```tldraw[^\n]*\n([\s\S]*?)\n```/)
      if(!match)return 0
      const snapshot=JSON.parse(match[1]) as {store:Record<string,{typeName:string;type?:string;props?:{src?:string;assetId?:string}}>}
      const images=Object.values(snapshot.store ?? {}).filter(row=>row.typeName==='shape'&&row.type==='image')
      expect(images.every(row=>snapshot.store[row.props!.assetId!]?.props?.src?.startsWith('data:image/png'))).toBe(true)
      return images.length
    },{timeout:2000}).toBe(3)
  } finally {removeFixtureVaultCopy(root)}
})
