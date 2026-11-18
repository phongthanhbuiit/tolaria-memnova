import { defaultLang, Excalidraw, languages } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useContext, useEffect, useRef, useState } from 'react'
import { useAppLocale } from '../hooks/useAppPreferences'
import { useDocumentThemeMode } from '../hooks/useDocumentThemeMode'
import { DocumentRenderContext } from './documentRenderContext'
import { readScene } from './excalidrawScene'
import { translate, type AppLocale } from '../lib/i18n'

// Excalidraw 0.18 bundles these catalogs but omits them from its language picker
// because of translation coverage. Missing messages still use the SDK fallback.
for (const locale of [{ code: 'vi-VN', label: 'Tiếng Việt' }, { code: 'pt-PT', label: 'Português' }]) {
  if (!languages.some(language => language.code === locale.code)) languages.push(locale)
}

function getDrawingLanguage(locale: AppLocale): string {
  const code = locale === 'vi' ? 'vi-VN' : locale === 'es-419' ? 'es-ES' : locale
  return languages.some(language => language.code === code) ? code : defaultLang.code
}

const vietnameseLabelFallbacks = [
  { selector: '.App-toolbar__extra-tools-trigger', key: 'a11y.whiteboardMoreTools' },
  { selector: '.help-icon, [data-testid="help-menu-item"]', key: 'a11y.whiteboardHelp' },
] as const

function localizeVietnameseDrawingLabels(drawing: HTMLElement) {
  const changed = new WeakMap<Element, Map<string, { previous: string; next: string }>>()
  const apply = () => {
    for (const { selector, key } of vietnameseLabelFallbacks) {
      const fallback = translate('en', key)
      const label = translate('vi', key)
      for (const element of drawing.querySelectorAll(selector)) {
        for (const attribute of ['title', 'aria-label']) {
          const previous = element.getAttribute(attribute)
          if (previous !== fallback && !previous?.startsWith(fallback + ' — ')) continue
          const next = label + previous.slice(fallback.length)
          const attributes = changed.get(element) ?? new Map()
          attributes.set(attribute, { previous, next })
          changed.set(element, attributes)
          element.setAttribute(attribute, next)
        }
      }
    }
  }
  const observer = new MutationObserver(apply)
  observer.observe(drawing, { attributes: true, attributeFilter: ['title', 'aria-label'], childList: true, subtree: true })
  apply()
  return () => {
    observer.disconnect()
    for (const { selector } of vietnameseLabelFallbacks) {
      for (const element of drawing.querySelectorAll(selector)) {
        for (const [attribute, { previous, next }] of changed.get(element) ?? []) {
          if (element.getAttribute(attribute) === next) element.setAttribute(attribute, previous)
        }
      }
    }
  }
}

interface Props {
  blockId: string
  snapshot: string
  height: string
  readOnly?: boolean
  onSnapshotChange: (value: string) => void
}

export default function ExcalidrawWhiteboard(props: Props) {
  const lastWrite = useRef(props.snapshot)
  const [source, setSource] = useState(props.snapshot)
  useEffect(() => {
    if (props.snapshot === lastWrite.current) return
    lastWrite.current = props.snapshot
    queueMicrotask(() => setSource(props.snapshot))
  }, [props.snapshot])
  return <DrawingSession key={source} {...props} source={source} onSnapshotChange={value => {
    lastWrite.current = value
    props.onSnapshotChange(value)
  }} />
}

function DrawingSession({ source, blockId, readOnly, height, onSnapshotChange }: Props & { source: string }) {
  const drawingRef = useRef<HTMLDivElement>(null)
  const appLocale = useAppLocale()
  const [scene] = useState(() => readScene(source))
  const last = useRef(JSON.stringify({elements: scene?.elements, files: scene?.files}))
  const report = useContext(DocumentRenderContext)
  const theme = useDocumentThemeMode()
  const langCode = getDrawingLanguage(appLocale)
  useEffect(() => {
    if (!scene) report?.(blockId, 'error')
    return () => report?.(blockId, 'loading')
  }, [blockId, report, scene])
  useEffect(() => {
    const drawing = drawingRef.current
    if (!drawing) return

    // Excalidraw 0.18 renders the main menu trigger internally without a name.
    const label = translate(appLocale, 'a11y.whiteboardMenu')
    const nameMenu = () => {
      const trigger = drawing.querySelector('button[data-testid="main-menu-trigger"]')
      if (trigger && trigger.getAttribute('aria-label') !== label) trigger.setAttribute('aria-label', label)
    }
    const observer = new MutationObserver(nameMenu)
    observer.observe(drawing, { childList: true, subtree: true })
    nameMenu()
    return () => observer.disconnect()
  }, [appLocale])
  useEffect(() => {
    if (appLocale === 'vi' && drawingRef.current) return localizeVietnameseDrawingLabels(drawingRef.current)
  }, [appLocale])
  useEffect(() => {
    if (!scene) return
    // The SDK sets the document language globally. Keep the app language on
    // the root and scope the SDK language to the drawing.
    const html = document.documentElement
    const restoreAppLanguage = () => {
      if (html.lang !== appLocale) html.lang = appLocale
    }
    const observer = new MutationObserver(restoreAppLanguage)
    observer.observe(html, { attributes: true, attributeFilter: ['lang'] })
    restoreAppLanguage()
    return () => observer.disconnect()
  }, [appLocale, scene])
  if (!scene) return <p role="alert">{translate(appLocale, 'editor.whiteboard.loadError')}</p>
  return <div ref={drawingRef} role="group" aria-label="Excalidraw" lang={langCode} contentEditable={false} className="excalidraw-whiteboard w-full min-w-0 overflow-hidden rounded-md border" style={{height: Number(height) || 520}}>
    <Excalidraw initialData={scene} langCode={langCode} theme={theme} viewModeEnabled={readOnly}
      handleKeyboardGlobally={false} validateEmbeddable={false}
      onChange={(elements, _appState, files) => {
        report?.(blockId, 'ready')
        if (readOnly) return
        const data = JSON.stringify({elements, files})
        if (data === last.current) return
        last.current = data
        onSnapshotChange(JSON.stringify({type:'excalidraw', version:2, elements, files}))
      }} />
  </div>
}
