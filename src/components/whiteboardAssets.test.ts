import { expect, it, vi } from 'vitest'
import type { TLAsset, TLAssetContext } from 'tldraw'
import { createWhiteboardAssets } from './whiteboardAssets'
import { registerEditorResources } from './editorResourceScope'
import { uploadImageFile } from '../hooks/useImageDrop'
vi.mock('../hooks/useImageDrop',() => ({uploadImageFile:vi.fn()}))
vi.mock('../lib/telemetry',() => ({trackEvent:vi.fn()}))
vi.mock('@tauri-apps/api/core',() => ({convertFileSrc:(path:string)=>`asset://localhost${encodeURI(path)}`}))
const asset={type:'image',props:{src:'attachments/picture.png'}} as TLAsset
it('persists a portable URI and uses captured Library scope with a unique import filename',async()=>{
  vi.mocked(uploadImageFile).mockResolvedValueOnce('asset://localhost/library/attachments/unique.png')
  const adapter=createWhiteboardAssets({scope:{vaultPath:'/library'},active:()=>true,readOnly:false,issue:vi.fn()})
  expect(await adapter.upload(asset,new File(['image'],'ảnh nhớ.png',{type:'image/png'}))).toEqual({src:'asset://memnova/attachments/unique.png'})
  expect(vi.mocked(uploadImageFile).mock.calls.at(-1)?.[0].name).toMatch(/^[0-9a-f-]{36}-ảnh nhớ.png$/)
  expect(vi.mocked(uploadImageFile).mock.calls.at(-1)?.[1]).toBe('/library')
})
it('rejects a delayed upload after another note replaces the captured editor visit',async()=>{
  const editor={}, visit=registerEditorResources(editor,'/library','/library/a.md')
  let finish:(value:string)=>void=()=>{}
  vi.mocked(uploadImageFile).mockReturnValueOnce(new Promise(resolve=>{finish=resolve}))
  const adapter=createWhiteboardAssets({scope:visit,active:visit.isCurrent,readOnly:false,issue:vi.fn()})
  const pending=adapter.upload(asset,new File(['image'],'image.png'))
  const replacement=registerEditorResources(editor,'/library','/library/b.md')
  finish('asset://localhost/library/attachments/old.png')
  await expect(pending).rejects.toMatchObject({name:'AbortError'})
  visit.dispose(); expect(replacement.isCurrent()).toBe(true); replacement.dispose()
})
it('never uploads in readonly mode and reports legacy media once without rewriting it',async()=>{
  const issue=vi.fn(), adapter=createWhiteboardAssets({scope:{vaultPath:'/library'},active:()=>true,readOnly:true,issue})
  await expect(adapter.upload(asset,new File(['image'],'image.png'))).rejects.toThrow('Read-only')
  const legacy={...asset,props:{...asset.props,src:'asset://localhost/library/attachments/old.png'}} as TLAsset
  expect(await adapter.resolve!(legacy,{} as TLAssetContext)).toBe('asset://localhost/library/attachments/old.png')
  await adapter.resolve!(legacy,{} as TLAssetContext)
  expect(issue.mock.calls).toEqual([['legacy']]); expect(legacy.props.src).toContain('asset://localhost')
})

it('uses verified note-study URLs for canvas assets and never falls back to a foreign basename', async () => {
  const issue=vi.fn()
  const adapter=createWhiteboardAssets({scope:{vaultPath:'/new-library',resolveMedia:source=>source==='asset://memnova/attachments/ảnh.svg'?'asset://localhost/new-library/attachments/ảnh.svg?memnova-sha256=current':null},active:()=>true,readOnly:true,issue})
  const verified={...asset,props:{...asset.props,src:'asset://memnova/attachments/ảnh.svg'}} as TLAsset
  expect(await adapter.resolve!(verified,{} as TLAssetContext)).toContain('memnova-sha256=current')
  const foreign={...asset,props:{...asset.props,src:'asset://foreign/attachments/ảnh.svg'}} as TLAsset
  expect(await adapter.resolve!(foreign,{} as TLAssetContext)).toBeNull()
  expect(issue).toHaveBeenCalledWith('unavailable')
})
