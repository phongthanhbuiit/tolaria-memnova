import { afterEach, expect, it, vi } from 'vitest'
import type { Editor } from 'tldraw'
import { insertCanvasVocabulary } from './insertCanvasVocabulary'
import { registerEditorResources } from './editorResourceScope'
import { copyImageToVault } from '../hooks/useImageDrop'
vi.mock('tldraw',()=>({AssetRecordType:{createId:()=> 'asset:unique'},createShapeId:()=> 'shape:unique'}))
vi.mock('../hooks/useImageDrop',()=>({copyImageToVault:vi.fn()}))
vi.mock('../lib/telemetry',()=>({trackEvent:vi.fn()}))
vi.mock('@tauri-apps/api/core',()=>({convertFileSrc:(path:string)=>`asset://localhost${encodeURI(path)}`}))
afterEach(()=>vi.unstubAllGlobals())
function fixture() {
  const owner={}, visit=registerEditorResources(owner,'/library','/library/owner.md')
  const editor={createAssets:vi.fn((assets:{props:{src:string}}[])=>{void assets}),createShapes:vi.fn(),getViewportPageBounds:()=>({center:{x:100,y:100}})}
  let complete=()=>{}, fail=()=>{}
  vi.stubGlobal('Image',class {
    src='';naturalWidth=300;naturalHeight=200;onload:(()=>void)|null=null;onerror:(()=>void)|null=null
    constructor(){complete=()=>this.onload?.();fail=()=>this.onerror?.()}
  })
  const options={editor:editor as unknown as Editor,source:'attachments/ảnh%20nhớ.png',title:'Vocabulary',sourcePath:'/library/vocab/word.md',visit,active:visit.isCurrent,issue:vi.fn()}
  return{owner,visit,editor,options,complete:()=>complete(),fail:()=>fail()}
}
it('inserts a portable image reference after dimensions load successfully',async()=>{
  const f=fixture(), pending=insertCanvasVocabulary(f.options)
  await Promise.resolve(); f.complete(); expect(await pending).toBe(true)
  expect(f.editor.createAssets.mock.calls[0][0][0].props.src).toBe('asset://memnova/attachments/%E1%BA%A3nh%20nh%E1%BB%9B.png')
  expect(f.editor.createShapes).toHaveBeenCalledOnce();f.visit.dispose()
})
it('does not insert a late image after switching the owner note',async()=>{
  const f=fixture(), pending=insertCanvasVocabulary(f.options)
  await Promise.resolve();const replacement=registerEditorResources(f.owner,'/library','/library/next.md')
  f.complete();expect(await pending).toBe(false);expect(f.editor.createAssets).not.toHaveBeenCalled()
  replacement.dispose()
})
it('copies a selected vocabulary image outside attachments using its own source base path',async()=>{
  const f=fixture();vi.mocked(copyImageToVault).mockResolvedValueOnce('asset://localhost/library/attachments/copied.png')
  const pending=insertCanvasVocabulary({...f.options,source:'images/word.png'})
  await Promise.resolve();await Promise.resolve();await Promise.resolve();f.complete()
  expect(await pending).toBe(true)
  expect(copyImageToVault).toHaveBeenCalledWith({vaultPath:'/library',sourcePath:'/library/vocab/images/word.png'})
  expect(f.editor.createAssets.mock.calls[0][0][0].props.src).toBe('asset://memnova/attachments/copied.png');f.visit.dispose()
})
it('reports a failed image without creating a placeholder asset or shape',async()=>{
  const f=fixture(), pending=insertCanvasVocabulary(f.options)
  await Promise.resolve();f.fail();expect(await pending).toBe(false)
  expect(f.options.issue).toHaveBeenCalledWith('unavailable');expect(f.editor.createAssets).not.toHaveBeenCalled();f.visit.dispose()
})
it('retains the SVG media type when inserting a vocabulary drawing',async()=>{
  const f=fixture(), pending=insertCanvasVocabulary({...f.options,source:'attachments/drawing.svg'})
  await Promise.resolve();f.complete();expect(await pending).toBe(true)
  expect(f.editor.createAssets.mock.calls[0][0][0].props).toMatchObject({mimeType:'image/svg+xml'})
  f.visit.dispose()
})
