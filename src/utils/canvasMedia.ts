import { attachmentAssetUrlFromPath } from './vaultAttachments'
import { canWritePathToVault } from './vaultPathContainment'
export type CanvasMediaIssue = 'online' | 'legacy' | 'unavailable'
export interface CanvasMediaScope { vaultPath?: string; notePath?: string }
export interface CanvasMediaResolution { url: string | null; relativePath?: string; path?: string; issue?: CanvasMediaIssue }
const unavailable = (): CanvasMediaResolution => ({ url: null,issue: 'unavailable' })
function fileUrl(path: string): URL {
  const normalized = path.replace(/\\/g,'/'), prefix = normalized.startsWith('/') ? 'file://' : 'file:///'
  return new URL(prefix + normalized.split('/').map(encodeURIComponent).join('/'))
}
function diskPath(url: URL): string {
  const path = decodeURIComponent(url.pathname)
  return /^\/[a-z]:\//i.test(path) ? path.slice(1) : path
}
function sourceUrl(source: string,scope: CanvasMediaScope): URL {
  if (/^[a-z][a-z0-9+.-]*:/i.test(source) && !/^[a-z]:[\\/]/i.test(source)) return new URL(source)
  const root = scope.vaultPath!
  if (source.startsWith('/') || /^[a-z]:[\\/]/i.test(source)) return fileUrl(source)
  if (source.startsWith('attachments/')) return new URL(source,fileUrl(`${root.replace(/[\\/]$/,'')}/`))
  return new URL(source,scope.notePath ? fileUrl(scope.notePath) : fileUrl(`${root.replace(/[\\/]$/,'')}/`))
}
function localMedia(source: string,url: URL,scope: CanvasMediaScope): CanvasMediaResolution {
  const root = scope.vaultPath?.replace(/\\/g,'/').replace(/\/+$/,'')
  if (!root || /%2f|%5c/i.test(url.pathname)) return unavailable()
  const path = diskPath(url)
  if (!canWritePathToVault(path,root)) return unavailable()
  const relativePath = path.slice(root.length + 1)
  if (!relativePath || relativePath.split('/').some(part => !part || part === '..' || part === '.' || ['.git','.memnova'].includes(part.toLowerCase()))) return unavailable()
  const legacy = url.protocol !== 'file:' || source.startsWith('/') || /^[a-z]:[\\/]/i.test(source) || source.startsWith('file:')
  return { url: attachmentAssetUrlFromPath({ path }),relativePath,path,...(legacy ? { issue: 'legacy' as const } : {}) }
}
function runtimeMedia(url: URL,source: string,scope: CanvasMediaScope): CanvasMediaResolution {
  const decoded = decodeURIComponent(url.pathname.slice(1))
  const absolute = /^(?:[\\/]|[a-z]:)/i.test(decoded) ? decoded : `/${decoded}`
  const result = localMedia(source,fileUrl(absolute),scope)
  return result.url ? { ...result,issue: 'legacy' } : result
}
export function portableCanvasSource(relativePath: string): string {
  if (!relativePath.startsWith('attachments/') || relativePath.split('/').some(part => !part || part === '..' || part === '.')) throw Error('Nonportable canvas source')
  return `asset://memnova/${relativePath.split('/').map(encodeURIComponent).join('/')}`
}
function portableMedia(url: URL,scope: CanvasMediaScope): CanvasMediaResolution {
  if (!scope.vaultPath || url.href.includes('?') || url.href.includes('#') || !url.pathname.startsWith('/attachments/')) return unavailable()
  const relative = url.pathname.slice(1)
  return localMedia(relative,new URL(relative,fileUrl(`${scope.vaultPath.replace(/[\\/]$/,'')}/`)),scope)
}
/** Resolve for display only; never rewrites a stored snapshot or guesses by basename. */
export function resolveCanvasMedia(source: string,scope: CanvasMediaScope): CanvasMediaResolution {
  if (source.startsWith('data:')) return { url: source }
  try {
    const url = sourceUrl(source,scope)
    if (url.username || url.password) return unavailable()
    if (['http:','https:'].includes(url.protocol) && url.hostname !== 'asset.localhost') return { url: source,issue: 'online' }
    if (url.port) return unavailable()
    if (url.protocol === 'asset:' && url.hostname === 'memnova') return portableMedia(url,scope)
    if (!['file:','asset:','http:','https:'].includes(url.protocol)) return unavailable()
    if (url.protocol === 'asset:' && url.hostname !== 'localhost') return unavailable()
    if (url.protocol === 'asset:' || url.hostname === 'asset.localhost') return runtimeMedia(url,source,scope)
    if (url.protocol === 'file:' && url.hostname && url.hostname !== 'localhost') return unavailable()
    return localMedia(source,url,scope)
  } catch { return unavailable() }
}
