import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'

export function readScene(source: string): ExcalidrawInitialDataState | null {
  try {
    const value = JSON.parse(source)
    if (value && Object.getPrototypeOf(value) === Object.prototype && !Object.keys(value).length)
      return { elements: [], files: {} }
    if (value?.type !== 'excalidraw' || value.version !== 2 || !Array.isArray(value.elements)) return null
    if (!value.elements.every((element: Record<string, unknown> | null) => element && typeof element.id === 'string' && typeof element.type === 'string')) return null
    const files = value.files ?? {}
    if (typeof files !== 'object' || Array.isArray(files)) return null
    for (const element of value.elements) {
      if (element.type !== 'image' || element.isDeleted) continue
      const file = files[element.fileId]
      if (typeof file?.dataURL !== 'string' || !file.dataURL.startsWith('data:image/')) return null
    }
    return { elements: value.elements, files: value.files ?? {}, scrollToContent: true }
  } catch {
    return null
  }
}
