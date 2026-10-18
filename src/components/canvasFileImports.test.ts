import { expect, it, vi } from 'vitest'
import type { Editor, TLAsset } from 'tldraw'
import { createShapesForAssets } from 'tldraw'
import { installCanvasFileImports } from './canvasFileImports'
vi.mock('tldraw',()=>({createShapesForAssets:vi.fn().mockResolvedValue([]),AssetRecordType:{createId:()=> 'asset:new'}}))
function fixture(){
  let handler:(info:{files:File[];point?:{x:number;y:number}})=>Promise<void>=async()=>{}
  const editor={options:{maxFilesAtOnce:3},inputs:{getShiftKey:()=>false,getCurrentPagePoint:()=>({x:0,y:0})},getViewportPageBounds:()=>({center:{x:10,y:20}}),getAssetForExternalContent:vi.fn(),registerExternalContentHandler:vi.fn((_type:string,next:typeof handler|null)=>{if(_type==='files' && next)handler=next})}
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

it('replaces media only after durable upload; failure or stale selection keeps the previous shape', async () => {
  const handlers = new Map<string, (content: { file: File; shapeId: string; isImage: boolean }) => Promise<unknown>>()
  const previous = { id: 'shape:image', type: 'image', x: 30, y: 40, rotation: .2, props: { assetId: 'asset:old', w: 200, h: 100, crop: { topLeft: { x: .1, y: .2 }, bottomRight: { x: .9, y: .8 } } } }
  let shape = previous
  let active = true
  const editor = { registerExternalContentHandler: vi.fn((kind: string, handler: unknown) => { if (handler) handlers.set(kind, handler as (content: { file: File; shapeId: string; isImage: boolean }) => Promise<unknown>) }), getShape: vi.fn(() => shape), getAssetForExternalContent: vi.fn(), createAssets: vi.fn(), updateShapes: vi.fn(), run: vi.fn((callback: () => void) => callback()) }
  const issue = vi.fn(), busy = vi.fn(), dispose = installCanvasFileImports(editor as unknown as Editor, () => active, issue, busy)
  const replacement = handlers.get('file-replace')
  expect(replacement).toBeTypeOf('function')
  const input = { file: new File(['new image'], 'new.png'), shapeId: previous.id, isImage: true }
  editor.getAssetForExternalContent.mockRejectedValueOnce(Error('disk full'))
  await replacement!(input)
  expect(editor.updateShapes).not.toHaveBeenCalled()
  expect(editor.createAssets).not.toHaveBeenCalled()
  expect(issue).toHaveBeenCalledWith('unavailable')
  let finish: (asset: TLAsset) => void = () => {}
  const asset = { id: 'asset:new', type: 'image', props: { src: 'asset://memnova/attachments/new.png' } } as TLAsset
  editor.getAssetForExternalContent.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const uploading = replacement!(input)
  expect(editor.updateShapes).not.toHaveBeenCalled()
  shape = { ...previous, x: 80 }
  finish(asset); await uploading
  expect(editor.updateShapes).not.toHaveBeenCalled()
  editor.getAssetForExternalContent.mockResolvedValueOnce(asset)
  await replacement!(input)
  expect(editor.createAssets).toHaveBeenCalledWith([asset])
  expect(editor.updateShapes).toHaveBeenCalledWith([{ id: previous.id, type: 'image', props: { assetId: asset.id } }])
  expect(shape.props).toEqual(previous.props)
  expect(editor.run).toHaveBeenCalledOnce()
  editor.updateShapes.mockClear(); editor.createAssets.mockClear()
  editor.getAssetForExternalContent.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const leaving = replacement!(input); active = false; finish(asset); await leaving
  expect(editor.updateShapes).not.toHaveBeenCalled()
  expect(editor.createAssets).not.toHaveBeenCalled()
  dispose()
})
