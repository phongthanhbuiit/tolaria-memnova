import { AssetRecordType, createTLStore } from 'tldraw'
import { expect, it, vi } from 'vitest'
import { createWhiteboardAssets } from './whiteboardAssets'
vi.mock('../hooks/useImageDrop',()=>({uploadImageFile:vi.fn().mockResolvedValue(`asset://localhost/${encodeURIComponent('/library/attachments/ảnh nhớ.png')}`)}))
vi.mock('../lib/telemetry',()=>({trackEvent:vi.fn()}))
vi.mock('@tauri-apps/api/core',()=>({convertFileSrc:(path:string)=>`asset://localhost${encodeURI(path)}`}))
it('accepts a newly uploaded portable source with the real tldraw asset schema',async()=>{
  const store=createTLStore(), asset=AssetRecordType.create({type:'image',props:{name:'Image',src:'data:image/png;base64,AA==',w:160,h:100,mimeType:'image/png',isAnimated:false}})
  const adapter=createWhiteboardAssets({scope:{vaultPath:'/library'},active:()=>true,readOnly:false,issue:vi.fn()})
  const {src}=await adapter.upload(asset,new File(['image'],'ảnh nhớ.png',{type:'image/png'}))
  expect(()=>store.put([{...asset,props:{...asset.props,src}}])).not.toThrow()
  expect(src).not.toContain('/library/')
})
