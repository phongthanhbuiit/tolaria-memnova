import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useContext, useEffect, useRef, useState } from 'react'
import { useDocumentThemeMode } from '../hooks/useDocumentThemeMode'
import { DocumentRenderContext } from './documentRenderContext'
import { readScene } from './excalidrawScene'
import { resolveEffectiveLocale, translate } from '../lib/i18n'

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
  const [scene] = useState(() => readScene(source))
  const last = useRef(JSON.stringify({elements: scene?.elements, files: scene?.files}))
  const report = useContext(DocumentRenderContext)
  const theme = useDocumentThemeMode()
  const locale = resolveEffectiveLocale(document.documentElement.lang)
  useEffect(() => {
    if (!scene) report?.(blockId, 'error')
    return () => report?.(blockId, 'loading')
  }, [blockId, report, scene])
  if (!scene) return <p role="alert">{translate(locale, 'editor.whiteboard.loadError')}</p>
  return <div role="group" aria-label="Excalidraw" contentEditable={false} className="excalidraw-whiteboard w-full min-w-0 overflow-hidden rounded-md border" style={{height: Number(height) || 520}}>
    <Excalidraw initialData={scene} theme={theme} viewModeEnabled={readOnly}
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
