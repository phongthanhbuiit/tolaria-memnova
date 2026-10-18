import type { DocumentRenderStatus } from '../../components/documentRenderGate'
import type { RenderMedia } from './verifiedNoteMedia'
type MediaElement = HTMLImageElement | HTMLMediaElement
function mediaElement(kind: RenderMedia['kind']): MediaElement {
  return kind === 'image' ? new Image() : document.createElement(kind)
}
/** Preload only the mounted face, including offscreen canvas assets; dispose all visit-owned handlers. */
export function watchNoteMedia(
  media: readonly RenderMedia[],
  changed: (status: DocumentRenderStatus) => void,
  create = mediaElement
): () => void {
  let active = true
  let previous: DocumentRenderStatus | null = null
  const states: DocumentRenderStatus[] = media.map(() => 'loading')
  const emit = () => {
    const status = states.includes('error')
      ? 'error'
      : states.every((value) => value === 'ready')
        ? 'ready'
        : 'loading'
    if (active && status !== previous) {
      previous = status
      changed(status)
    }
  }
  emit()
  const cleanups = media.map((item, index) => {
    const element = create(item.kind)
    const loaded = () => {
      states[index] =
        element instanceof HTMLImageElement && element.naturalWidth === 0
          ? 'error'
          : 'ready'
      emit()
    }
    const failed = () => {
      states[index] = 'error'
      emit()
    }
    const readyEvent = item.kind === 'image' ? 'load' : 'loadedmetadata'
    element.addEventListener(readyEvent, loaded)
    element.addEventListener('error', failed)
    if (element instanceof HTMLMediaElement) element.preload = 'metadata'
    element.src = item.url
    return () => {
      element.removeEventListener(readyEvent, loaded)
      element.removeEventListener('error', failed)
      if (element instanceof HTMLMediaElement) element.pause()
      element.removeAttribute('src')
      if (element instanceof HTMLMediaElement) element.load()
    }
  })
  return () => {
    active = false
    cleanups.forEach((cleanup) => cleanup())
  }
}
