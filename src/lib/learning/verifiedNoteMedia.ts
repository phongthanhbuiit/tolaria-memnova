import { convertFileSrc } from '@tauri-apps/api/core'
import type { NoteMediaDependency } from './types'
export type NoteMediaResolver = (source: string) => string | null
export type RenderMedia = { url: string; kind: 'image' | 'audio' | 'video' }
function checkedDependency(value: NoteMediaDependency) {
  if (
    !value.path ||
    /^(?:[a-z]:|[\\/])/i.test(value.path) ||
    value.path
      .split(/[\\/]/)
      .some(
        (part) =>
          !part || ['.', '..', '.git', '.memnova'].includes(part.toLowerCase())
      ) ||
    !/^[a-f\d]{64}$/i.test(value.sha256) ||
    !Number.isSafeInteger(value.bytes) ||
    value.bytes < 0
  )
    throw Error('invalid-verified-note-media')
}
/** Native descriptors are authoritative: never reconstruct a local URL from unverified Markdown. */
export function createVerifiedNoteMedia(
  root: string,
  dependencies: readonly NoteMediaDependency[]
): NoteMediaResolver {
  const urls = new Map<string, string>()
  for (const dependency of dependencies) {
    checkedDependency(dependency)
    const url = `${convertFileSrc(`${root.replace(/[\\/]$/, '')}/${dependency.path}`)}?memnova-sha256=${dependency.sha256}`
    if (urls.has(dependency.url) && urls.get(dependency.url) !== url)
      throw Error('ambiguous-verified-note-media')
    urls.set(dependency.url, url)
  }
  return (source) => {
    const verified = urls.get(source)
    if (verified) return verified
    if (/^data:(?:image|audio|video)\//i.test(source)) return source
    try {
      const url = new URL(source)
      if (
        ['http:', 'https:'].includes(url.protocol) &&
        url.hostname !== 'asset.localhost' &&
        !url.username &&
        !url.password
      )
        return source
    } catch {
      /* Unverified local paths are intentionally unavailable. */
    }
    return null
  }
}
function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}
const mediaKinds = new Set(['image', 'audio', 'video'])
export function prepareNoteRenderBlocks(
  blocks: readonly unknown[],
  resolve: NoteMediaResolver
): unknown[] {
  return blocks.map((block) => {
    const value = record(block)
    if (!value) return block
    const props = record(value.props)
    let next = value
    if (
      mediaKinds.has(String(value.type)) &&
      typeof props?.url === 'string' &&
      props.url
    ) {
      const url = resolve(props.url)
      if (!url) throw Error('unverified-note-media')
      next = { ...value, props: { ...props, url } }
    }
    return Array.isArray(value.children)
      ? { ...next, children: prepareNoteRenderBlocks(value.children, resolve) }
      : next
  })
}
function canvasMedia(
  snapshot: string,
  resolve: NoteMediaResolver
): RenderMedia[] {
  let parsed: Record<string, unknown> | null
  try {
    parsed = record(JSON.parse(snapshot))
  } catch {
    return []
  }
  const document = record(parsed?.document)
  const store =
    record(parsed?.store) ?? record(parsed?.records) ?? record(document?.store)
  if (!store) return []
  const result: RenderMedia[] = []
  for (const value of Object.values(store)) {
    const shape = record(value),
      props = record(shape?.props)
    if (shape?.typeName !== 'shape' || typeof props?.assetId !== 'string')
      continue
    const asset =
      record(store[props.assetId]) ??
      Object.values(store)
        .map(record)
        .find((item) => item?.id === props.assetId)
    const assetProps = record(asset?.props)
    if (
      typeof assetProps?.src !== 'string' ||
      !['image', 'video'].includes(String(asset?.type))
    )
      continue
    const url = resolve(assetProps.src)
    if (!url) throw Error('unverified-note-media')
    result.push({ url, kind: asset?.type === 'video' ? 'video' : 'image' })
  }
  return result
}
/** Only rendered block media and shape-referenced assets, never arbitrary note links/unused assets. */
export function noteRenderMedia(
  blocks: readonly unknown[],
  resolve: NoteMediaResolver
): RenderMedia[] {
  const media: RenderMedia[] = []
  for (const block of blocks) {
    const value = record(block),
      props = record(value?.props)
    if (!value) continue
    if (
      ['image', 'audio', 'video'].includes(String(value.type)) &&
      typeof props?.url === 'string' &&
      props.url
    )
      media.push({ url: props.url, kind: value.type as RenderMedia['kind'] })
    if (value.type === 'tldrawBlock' && typeof props?.snapshot === 'string')
      media.push(...canvasMedia(props.snapshot, resolve))
    if (Array.isArray(value.children))
      media.push(...noteRenderMedia(value.children, resolve))
  }
  return [
    ...new Map(
      media.map((item) => [`${item.kind}:${item.url}`, item])
    ).values(),
  ]
}
