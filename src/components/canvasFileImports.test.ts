import { expect, it, vi } from 'vitest'
import type { Editor, TLAsset } from 'tldraw'
import { createShapesForAssets } from 'tldraw'
import { installCanvasFileImports } from './canvasFileImports'
vi.mock('tldraw',()=>({createShapesForAssets:vi.fn().mockResolvedValue([])}))
function fixture(){
  let handler:(info:{files:File[];point?:{x:number;y:number}})=>Promise<void>=async()=>{}
  const editor={options:{maxFilesAtOnce:3},inputs:{getShiftKey:()=>false,getCurrentPagePoint:()=>({x:0,y:0})},getViewportPageBounds:()=>({center:{x:10,y:20}}),getAssetForExternalContent:vi.fn(),registerExternalContentHandler:vi.fn((_type:string,next:typeof handler|null)=>{if(next)handler=next})}
  let active=true;const issue=vi.fn(),dispose=installCanvasFileImports(editor as unknown as Editor,()=>active,issue)
  return{editor,issue,dispose,run:(files:File[])=>handler({files}),leave:()=>{active=false}}
}
it('adds no placeholder shapes before upload has a durable source',async()=>{
  vi.mocked(createShapesForAssets).mockClear()
  const f=fixture();let finish:(asset:TLAsset)=>void=()=>{}
  f.editor.getAssetForExternalContent.mockReturnValueOnce(new Promise(resolve=>{finish=resolve}))
  const running=f.run([new File(['image'],'image.png')])
  expect(createShapesForAssets).not.toHaveBeenCalled()
  const asset={type:'image',props:{src:'asset://memnova/attachments/image.png'}} as TLAsset
  finish(asset);await running
  expect(createShapesForAssets).toHaveBeenCalledWith(f.editor,[asset],{x:10,y:20});f.dispose()
})
it('does not add late or failed uploads to the document',async()=>{
  vi.mocked(createShapesForAssets).mockClear()
  const f=fixture();let finish:(asset:TLAsset)=>void=()=>{}
  f.editor.getAssetForExternalContent.mockReturnValueOnce(new Promise(resolve=>{finish=resolve}))
  const running=f.run([new File(['image'],'image.png')]);f.leave();finish({type:'image'} as TLAsset);await running
  expect(createShapesForAssets).not.toHaveBeenCalled();f.dispose()
  const failed=fixture();failed.editor.getAssetForExternalContent.mockRejectedValueOnce(Error('disk full'))
  await failed.run([new File(['image'],'image.png')]);expect(createShapesForAssets).not.toHaveBeenCalled();expect(failed.issue).toHaveBeenCalledWith('unavailable');failed.dispose()
})
