import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'

// Browser text/learning model and real fixture files; native byte preservation is tested by IPC.
test('source picker Cancel is read-only and inline to linked to inline retains both notes', async ({ page }) => {
  test.setTimeout(60_000)
  const root=createFixtureVaultCopy(),owner=path.join(root,'note/note-b.md'),target=path.join(root,'note/note-c.md')
  const originalOwner='---\nIs A: Note\nStatus: Active\n_memnova_page_id: 11111111-1111-4111-8111-111111111111\n_memnova_learning_version: 1\n_memnova_learning_enabled: false\n_memnova_back_kind: inline\ncustom: 9007199254740999\n---\n# Note B\n\nOwner article\n<!-- FLASHCARD:BACK -->\nOwner retained mnemonic\n'
  const originalTarget='---\nIs A: Note\nStatus: Active\ncustom: &value [9007199254740993, null]\ncopy: *value\n---\n# Note C\n\nSource front article\n<!-- FLASHCARD:BACK -->\nSource local mnemonic\n'
  try{
    fs.writeFileSync(owner,originalOwner);fs.writeFileSync(target,originalTarget)
    await openFixtureVault(page,root)
    await page.getByText('Note B',{exact:true}).first().click()
    const choose=page.getByRole('button',{name:'Choose a source',exact:true})
    const dialog=page.getByRole('dialog',{name:'Choose a source',exact:true})
    const selectTarget=async()=>{
      await choose.click()
      await dialog.getByLabel('Mnemonic source').fill('Note C')
      await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter')
      await expect(dialog).toContainText('Source front article')
    }
    await selectTarget()
    await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
    await expect(dialog).toBeHidden()
    expect(fs.readFileSync(owner,'utf8')).toBe(originalOwner)
    expect(fs.readFileSync(target,'utf8')).toBe(originalTarget)
    await selectTarget()
    await expect(dialog.getByRole('button',{name:'Use source',exact:true})).toBeDisabled()
    await dialog.getByRole('combobox',{name:'Source face',exact:true}).click()
    await page.getByRole('option',{name:'Article',exact:true}).click()
    await dialog.getByRole('button',{name:'Use source',exact:true}).click()
    await expect(dialog).toBeHidden()
    await expect.poll(()=>fs.readFileSync(owner,'utf8')).toContain('_memnova_back_kind: page')
    const registeredTarget=fs.readFileSync(target,'utf8')
    expect(registeredTarget.replace(/^_memnova_page_id: [^\n]+\n/m,'')).toBe(originalTarget)
    expect(registeredTarget).not.toContain('_memnova_learning_enabled')
    expect(fs.readFileSync(owner,'utf8')).toContain('Owner retained mnemonic')
    await page.getByRole('tab',{name:'Mnemonic',exact:true}).click()
    await expect(page.locator('.bn-editor:visible')).toContainText('Source front article')
    await expect(page.locator('.bn-editor:visible')).not.toContainText('Owner retained mnemonic')
    await page.screenshot({path:'/tmp/memnova-m16-linked-source.png'})
    await page.getByRole('button',{name:'Use local mnemonic',exact:true}).click()
    await expect(page.locator('.bn-editor:visible')).toContainText('Owner retained mnemonic')
    await expect.poll(()=>fs.readFileSync(owner,'utf8')).toBe(originalOwner)
    expect(fs.readFileSync(target,'utf8')).toBe(registeredTarget)
    const counts=await page.evaluate(root=>{
      const data=JSON.parse(localStorage.getItem(`memnova:qa-learning:${root}`)??'{}')
      return {cards:data.cards?.length??0,reviews:data.reviews?.length??0,sessions:data.sessions?.length??0,bindings:Object.keys(data.noteMemory?.bindings??{}).length}
    },root)
    expect(counts).toEqual({cards:0,reviews:0,sessions:0,bindings:0})
    await page.screenshot({path:'/tmp/memnova-m16-restored-inline.png'})
  }finally{removeFixtureVaultCopy(root)}
})
