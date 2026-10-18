import { expect, it, vi } from 'vitest'
import { mockLearningCommand } from './learning'
import type { NoteSourcePreview } from '../lib/learning/types'

async function fixture() {
  const root = `/qa/source-preview-${crypto.randomUUID()}`
  const original = '---\ncustom: &value [9007199254740993, null]\ncopy: *value\n---\nArticle\n<!-- FLASHCARD:BACK -->\nMnemonic\n'
  const files = new Map([[`${root}/source.md`, original]])
  const read = async (path: string) => { const source=files.get(path);if(source===undefined)throw Error('Missing source');return source }
  const write = vi.fn(async (path: string, source: string) => {files.set(path,source)})
  const context = {read,write,entries:async()=>[],allContent:async()=>Object.fromEntries(files)}
  const descriptor = await mockLearningCommand({vaultPath:root,request:{kind:'describe'}},context) as {libraryId:string}
  const call = (request:Record<string,unknown>)=>mockLearningCommand({vaultPath:root,libraryId:descriptor.libraryId,request},context)
  return {root,original,files,write,call,context,libraryId:descriptor.libraryId}
}
it('models source selection as read-only for ordinary Markdown without a UUID',async()=>{
  const {root,original,files,write,call}=await fixture()
  const storage=vi.spyOn(Storage.prototype,'setItem')
  try{
    expect(await call({kind:'previewNoteSource',path:'source.md',face:'front'})).toMatchObject({pageId:null,content:'Article\n',hasBack:true,backLinked:false})
    expect(await call({kind:'previewNoteSource',path:'source.md',face:'back'})).toMatchObject({content:'Mnemonic\n'})
    expect(storage).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(files.get(`${root}/source.md`)).toBe(original)
  }finally{storage.mockRestore()}
})
it('rejects a stale guarded registration without writing the source or creating a backup',async()=>{
  const {root,original,files,write,call}=await fixture()
  const preview=await call({kind:'previewNoteSource',path:'source.md',face:'front'}) as NoteSourcePreview
  files.set(`${root}/source.md`,original+'External edit')
  await expect(call({kind:'ensurePage',path:'source.md',expectedHash:preview.sourceHash})).rejects.toThrow('source')
  expect(write).not.toHaveBeenCalled()
  expect(await call({kind:'listBackups'})).toEqual([])
})
it('registers only on explicit Apply and keeps its text backup and selection fingerprint',async()=>{
  const {root,files,call,context,libraryId}=await fixture()
  const before=await call({kind:'previewNoteSource',path:'source.md',face:'front'}) as NoteSourcePreview
  const page=await call({kind:'ensurePage',path:'source.md',expectedHash:before.sourceHash}) as {id:string}
  const after=await call({kind:'previewNoteSource',path:'source.md',face:'front'}) as NoteSourcePreview
  expect(after.pageId).toBe(page.id)
  expect(after.fingerprint).toBe(before.fingerprint)
  expect(files.get(`${root}/source.md`)).toContain('custom: &value [9007199254740993, null]')
  const backups=await call({kind:'listBackups'}) as {id:string}[]
  expect(backups).toHaveLength(1)
  const restored=await call({kind:'restoreBackup',backupId:backups[0].id}) as {path:string}
  expect(restored.path).toContain(root)
  expect(await call({kind:'listCards',includeTrashed:true})).toEqual([])
  const restoredPreview=await mockLearningCommand({vaultPath:restored.path,libraryId,request:{kind:'previewNoteSource',path:'source.md',face:'front'}},context) as NoteSourcePreview
  expect(restoredPreview).toMatchObject({sourceHash:before.sourceHash,pageId:null})
})
it('previews an already registered source from a restored Library without consulting the old root',async()=>{
  const {call,context,libraryId}=await fixture()
  const before=await call({kind:'previewNoteSource',path:'source.md',face:'front'}) as NoteSourcePreview
  const page=await call({kind:'ensurePage',path:'source.md',expectedHash:before.sourceHash}) as {id:string}
  const backup=await call({kind:'createBackup'}) as {id:string}
  const restored=await call({kind:'restoreBackup',backupId:backup.id}) as {path:string}
  const preview=await mockLearningCommand({vaultPath:restored.path,libraryId,request:{kind:'previewNoteSource',path:'source.md',face:'front'}},context) as NoteSourcePreview
  expect(preview).toMatchObject({pageId:page.id,content:'Article\n',fingerprint:before.fingerprint})
})
