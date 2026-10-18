import type { TLAssetStore } from 'tldraw'
import { uploadImageFile } from '../hooks/useImageDrop'
import { portableCanvasSource, resolveCanvasMedia, type CanvasMediaIssue, type CanvasMediaScope } from '../utils/canvasMedia'
import { trackEvent } from '../lib/telemetry'
interface Options { scope: CanvasMediaScope; active: () => boolean; readOnly: boolean; issue: (value: CanvasMediaIssue) => void }
function requireActive(options: Options,signal?: AbortSignal) {
  if (signal?.aborted || !options.active()) throw new DOMException('Canvas visit ended','AbortError')
}
export function createWhiteboardAssets(options: Options): TLAssetStore {
  const reported = new Set<CanvasMediaIssue>()
  const resolve = (src: string) => {
    const verified = options.scope.resolveMedia
    const url = verified?.(src)
    const result = verified ? { url: url ?? null, ...(!url ? { issue: 'unavailable' as const } : {}) } : resolveCanvasMedia(src,options.scope)
    if (result.issue && !reported.has(result.issue)) { reported.add(result.issue); options.issue(result.issue) }
    return result
  }
  return {
    async upload(asset,file,signal) {
      requireActive(options,signal)
      if (options.readOnly) throw Error('Read-only canvas')
      const unique = new File([file],`${crypto.randomUUID()}-${file.name}`,{ type: file.type,lastModified: file.lastModified })
      const uploaded = await uploadImageFile(unique,options.scope.vaultPath)
      requireActive(options,signal)
      const result = resolveCanvasMedia(uploaded,options.scope)
      const src = uploaded.startsWith('data:') ? uploaded : result.relativePath
      if (!src || !uploaded.startsWith('data:') && !src.startsWith('attachments/')) throw Error('Nonportable canvas upload')
      trackEvent('memnova_canvas_asset_imported',{ kind: asset.type === 'image' ? 'image' : 'media',source: 'file' })
      return { src: uploaded.startsWith('data:') ? src : portableCanvasSource(src) }
    },
    resolve(asset) {
      if (!options.active()) return null
      return resolve(asset.props.src ?? '').url
    },
  }
}
