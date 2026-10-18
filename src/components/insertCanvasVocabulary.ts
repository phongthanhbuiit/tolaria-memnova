import { AssetRecordType, createShapeId, type Editor } from 'tldraw'
import { copyImageToVault } from '../hooks/useImageDrop'
import { portableCanvasSource, resolveCanvasMedia, type CanvasMediaIssue } from '../utils/canvasMedia'
import type { EditorResourceVisit } from './editorResourceScope'
import { trackEvent } from '../lib/telemetry'
interface Options { editor: Editor; source: string; title: string; sourcePath: string; visit: EditorResourceVisit; active: () => boolean; issue: (value: CanvasMediaIssue) => void }
function imageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve,reject) => {
    const image = new Image()
    image.onload = () => { image.onload = null; image.onerror = null; resolve({ w: image.naturalWidth || 300,h: image.naturalHeight || 300 }) }
    image.onerror = () => { image.onload = null; image.onerror = null; reject(Error('Canvas image unavailable')) }
    image.src = url
  })
}
async function portableImage(options: Options) {
  const scope = { vaultPath: options.visit.vaultPath,notePath: options.sourcePath }
  let resolution = resolveCanvasMedia(options.source,scope)
  if (!resolution.url || !resolution.relativePath || !resolution.path || !scope.vaultPath) throw Error('Canvas image unavailable')
  if (!resolution.relativePath.startsWith('attachments/')) {
    const copied = await copyImageToVault({vaultPath:scope.vaultPath,sourcePath:resolution.path})
    if (!options.active()) throw new DOMException('Canvas visit ended','AbortError')
    resolution = resolveCanvasMedia(copied,scope)
  }
  if (!resolution.url || !resolution.relativePath?.startsWith('attachments/')) throw Error('Canvas image unavailable')
  const extension = resolution.relativePath.split('.').at(-1)?.toLowerCase() ?? ''
  const types: Record<string,string> = { png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',gif:'image/gif',webp:'image/webp',bmp:'image/bmp',tif:'image/tiff',tiff:'image/tiff' }
  return { url:resolution.url,src:portableCanvasSource(resolution.relativePath),mimeType:types[extension] ?? null }
}
export async function insertCanvasVocabulary(options: Options): Promise<boolean> {
  try {
    if (!options.active()) return false
    const { url,src,mimeType } = await portableImage(options)
    if (!options.active()) return false
    const { w,h } = await imageSize(url)
    if (!options.active()) return false
    const assetId = AssetRecordType.createId(), center = options.editor.getViewportPageBounds().center
    options.editor.createAssets([{ id:assetId,type:'image',typeName:'asset',props:{name:options.title,src,w,h,mimeType,isAnimated:false},meta:{} }])
    options.editor.createShapes([{ id:createShapeId(),type:'image',x:center.x-w/2,y:center.y-h/2,props:{assetId,w,h} }])
    trackEvent('memnova_canvas_asset_imported',{kind:'image',source:'vocab'})
    return true
  } catch (error) {
    if (options.active() && !(error instanceof DOMException && error.name === 'AbortError')) options.issue('unavailable')
    return false
  }
}
