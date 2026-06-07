import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { ArrowsIn, ArrowsOut, Plus } from '@phosphor-icons/react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import {
  Box,
  Tldraw,
  createTLStore,
  defaultUserPreferences,
  getSnapshot,
  loadSnapshot,
  useDialogs,
  useTldrawUser,
  useValue,
  type Editor,
  type TLEventInfo,
  type TLUiDialog,
  type TLStoreSnapshot,
  type TLUserPreferences,
  AssetRecordType,
  createShapeId,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { useDocumentThemeMode } from '../hooks/useDocumentThemeMode'
import { resolveEffectiveLocale, translate, type AppLocale } from '../lib/i18n'
import type { ResolvedThemeMode } from '../lib/themeMode'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ActionTooltip } from './ui/action-tooltip'
import { installTldrawTextMeasurementGuard } from './tldrawTextMeasurementGuard'
import { vaultAttachmentAssetUrl } from '../utils/vaultAttachments'
import { _wikilinkEntriesRef, _activeVaultPathRef } from './editorSchema'
import type { VaultEntry } from '../types'

const EMPTY_TLDRAW_TRANSLATION_URL = 'data:application/json;base64,e30K'
const TOLARIA_TLDRAW_USER_ID = 'tolaria-whiteboard'
const WHITEBOARD_FULLSCREEN_BODY_CLASS = 'tldraw-whiteboard-fullscreen-open'

function resolveTldrawAssetUrl(assetUrl: string | undefined): string {
  return assetUrl ?? EMPTY_TLDRAW_TRANSLATION_URL
}

const tldrawAssetUrls = getAssetUrlsByImport(resolveTldrawAssetUrl)

interface TldrawWhiteboardProps {
  boardId: string
  height: string
  snapshot: string
  width: string
  readOnly?: boolean
  onSnapshotChange: (snapshot: string) => void
  onSizeChange: (size: TldrawWhiteboardSize) => void
}

interface TldrawWhiteboardSize {
  height: string
  width: string
}

interface PixelSize {
  height: number
  width: number | null
}

interface ResizeStart {
  height: number
  pointerX: number
  pointerY: number
  width: number
}

type ResizeMode = 'height' | 'width' | 'both'

const DEFAULT_HEIGHT = 520
const MIN_HEIGHT = 260
const MIN_WIDTH = 360

function parsePixelValue(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeSize({ height, width }: TldrawWhiteboardSize): PixelSize {
  return {
    height: parsePixelValue(height, DEFAULT_HEIGHT),
    width: width ? parsePixelValue(width, MIN_WIDTH) : null,
  }
}

function sizeToProps({ height, width }: PixelSize): TldrawWhiteboardSize {
  return {
    height: String(Math.max(MIN_HEIGHT, Math.round(height))),
    width: width === null ? '' : String(Math.max(MIN_WIDTH, Math.round(width))),
  }
}

function cssSize({ height, width }: PixelSize): CSSProperties {
  return {
    '--tldraw-whiteboard-height': `${Math.max(MIN_HEIGHT, height)}px`,
    '--tldraw-whiteboard-width': width === null ? '100%' : `${Math.max(MIN_WIDTH, width)}px`,
  } as CSSProperties
}

function tldrawUserPreferences(themeMode: ResolvedThemeMode): TLUserPreferences {
  return {
    ...defaultUserPreferences,
    id: TOLARIA_TLDRAW_USER_ID,
    colorScheme: themeMode,
  }
}

function ignoreTldrawUserPreferencesUpdate(preferences: TLUserPreferences) {
  void preferences
}

function readDocumentLocale(): AppLocale {
  if (typeof document === 'undefined') return 'en'
  return resolveEffectiveLocale(document.documentElement.lang)
}

function useDocumentLocale(): AppLocale {
  const [locale, setLocale] = useState(readDocumentLocale)

  useEffect(() => {
    if (typeof document === 'undefined') return

    const syncLocale = () => setLocale(readDocumentLocale())
    const observer = new MutationObserver(syncLocale)
    observer.observe(document.documentElement, { attributeFilter: ['lang'], attributes: true })
    syncLocale()

    return () => observer.disconnect()
  }, [])

  return locale
}

function rejectionName(error: unknown): string {
  if (error instanceof Error) return error.name
  if (typeof error !== 'object' || error === null || !('name' in error)) return ''

  const { name } = error
  return typeof name === 'string' ? name : ''
}

function rejectionMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (typeof error !== 'object' || error === null || !('message' in error)) return ''

  const { message } = error
  return typeof message === 'string' ? message : ''
}

function isWhiteboardPlatformPermissionRejection(reason: unknown): boolean {
  const name = rejectionName(reason).toLowerCase()
  const message = rejectionMessage(reason).toLowerCase()
  if (name === 'notallowederror') return true

  return message.includes('notallowederror') || (
    message.includes('not allowed')
    && (
      message.includes('permission')
      || message.includes('platform')
      || message.includes('user agent')
    )
  )
}

function installTldrawPlatformPermissionGuard(): () => void {
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!isWhiteboardPlatformPermissionRejection(event.reason)) return
    event.preventDefault()
  }

  window.addEventListener('unhandledrejection', handleUnhandledRejection)
  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }
}

function parseSnapshot(source: string): TLStoreSnapshot | null {
  if (!source.trim()) return null

  try {
    return JSON.parse(source) as TLStoreSnapshot
  } catch {
    return null
  }
}

function createBoardStore(boardId: string) {
  void boardId
  return createTLStore()
}

function serializeSnapshot(snapshot: TLStoreSnapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`
}

function documentZoom(): number {
  const inlineZoom = document.documentElement.style.getPropertyValue('zoom')
  const computedZoom = getComputedStyle(document.documentElement).zoom
  const zoom = inlineZoom || computedZoom
  const parsed = Number.parseFloat(zoom)
  if (!Number.isFinite(parsed) || parsed <= 0) return 1
  return zoom.endsWith('%') ? parsed / 100 : parsed
}

function viewportBounds(screenBounds: Box | HTMLElement): Box | HTMLElement {
  if (screenBounds instanceof Box) return screenBounds

  const zoom = documentZoom()
  if (zoom === 1) return screenBounds

  const rect = screenBounds.getBoundingClientRect()
  return new Box(
    (rect.left || rect.x) / zoom,
    (rect.top || rect.y) / zoom,
    Math.max(rect.width / zoom, 1),
    Math.max(rect.height / zoom, 1),
  )
}

function zoomAdjustedPoint<T extends { x: number; y: number; z?: number }>(point: T, zoom: number): T {
  return {
    ...point,
    x: point.x / zoom,
    y: point.y / zoom,
  }
}

function zoomAdjustedEvent(info: TLEventInfo): TLEventInfo {
  const zoom = documentZoom()
  if (zoom === 1) return info

  switch (info.type) {
    case 'click':
    case 'pinch':
    case 'pointer':
    case 'wheel':
      return {
        ...info,
        point: zoomAdjustedPoint(info.point, zoom),
      } as TLEventInfo
    default:
      return info
  }
}

function installZoomAwareViewport(editor: Editor): () => void {
  const updateViewportScreenBounds = editor.updateViewportScreenBounds.bind(editor)
  const updateViewport: Editor['updateViewportScreenBounds'] = (screenBounds, center) =>
    updateViewportScreenBounds(viewportBounds(screenBounds), center)
  const dispatch = editor.dispatch.bind(editor)
  const animationFrameIds: number[] = []
  const timeoutIds: number[] = []

  editor.updateViewportScreenBounds = updateViewport
  editor.dispatch = (info: TLEventInfo) => dispatch(zoomAdjustedEvent(info))

  const updateCurrentCanvas = () => {
    const canvas = editor.getContainer().querySelector<HTMLElement>('.tl-canvas')
    if (canvas) updateViewport(canvas)
  }

  const scheduleViewportUpdate = () => {
    updateCurrentCanvas()
    animationFrameIds.push(window.requestAnimationFrame(updateCurrentCanvas))
    timeoutIds.push(window.setTimeout(updateCurrentCanvas, 150))
  }

  scheduleViewportUpdate()
  window.addEventListener('laputa-zoom-change', scheduleViewportUpdate)

  return () => {
    window.removeEventListener('laputa-zoom-change', scheduleViewportUpdate)
    animationFrameIds.forEach((id) => {
      window.cancelAnimationFrame(id)
    })
    timeoutIds.forEach((id) => {
      window.clearTimeout(id)
    })
    editor.updateViewportScreenBounds = updateViewportScreenBounds
    editor.dispatch = dispatch
  }
}

function installWhiteboardRuntimeGuards(editor: Editor): () => void {
  const cleanupTextMeasurementGuard = installTldrawTextMeasurementGuard(editor)
  const cleanupZoomAwareViewport = installZoomAwareViewport(editor)
  const cleanupPlatformPermissionGuard = installTldrawPlatformPermissionGuard()

  return () => {
    cleanupPlatformPermissionGuard()
    cleanupZoomAwareViewport()
    cleanupTextMeasurementGuard()
  }
}

interface TolariaTldrawDialogProps {
  dialog: TLUiDialog
  onClose: (id: string) => void
}

const DIALOG_OPEN_DISMISS_GRACE_MS = 250
let retainedTolariaTldrawDialogs: TLUiDialog[] = []

function useDeferredDialogOpen() {
  const openedAtRef = useRef(0)
  const [readyToOpen, setReadyToOpen] = useState(false)

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      openedAtRef.current = performance.now()
      setReadyToOpen(true)
    })
    return () => { window.cancelAnimationFrame(animationFrameId) }
  }, [])

  return { openedAtRef, readyToOpen }
}

function canDismissDialog(openedAt: number): boolean {
  return performance.now() - openedAt >= DIALOG_OPEN_DISMISS_GRACE_MS
}

function isOverlayEvent(event: { currentTarget: EventTarget | null; target: EventTarget | null }): boolean {
  return event.target === event.currentTarget
}

function shouldCloseFromOverlayClick(
  event: { currentTarget: EventTarget | null; target: EventTarget | null },
  dialog: TLUiDialog,
  mouseDownInsideContent: boolean
): boolean {
  return isOverlayEvent(event) && !dialog.preventBackgroundClose && !mouseDownInsideContent
}

interface TolariaTldrawDialogContentProps {
  dialog: TLUiDialog
  mouseDownInsideContentRef: MutableRefObject<boolean>
  onClose: () => void
}

function TolariaTldrawDialogContent({
  dialog,
  mouseDownInsideContentRef,
  onClose,
}: TolariaTldrawDialogContentProps) {
  const ModalContent = dialog.component
  const handleClose = () => {
    mouseDownInsideContentRef.current = false
    onClose()
  }

  return (
    <div
      dir="ltr"
      className="tlui-dialog__content"
      aria-describedby={undefined}
      role="dialog"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        mouseDownInsideContentRef.current = false
        onClose()
      }}
      onMouseDown={() => { mouseDownInsideContentRef.current = true }}
      onMouseUp={() => { mouseDownInsideContentRef.current = false }}
    >
      <ModalContent onClose={handleClose} />
    </div>
  )
}

const TolariaTldrawDialog = memo(function TolariaTldrawDialog({ dialog, onClose }: TolariaTldrawDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const mouseDownInsideContentRef = useRef(false)
  const { openedAtRef, readyToOpen } = useDeferredDialogOpen()

  const closeDialogFromBackground = useCallback(() => {
    if (!canDismissDialog(openedAtRef.current)) return
    onClose(dialog.id)
  }, [dialog.id, onClose, openedAtRef])
  const closeDialogNow = useCallback(() => { onClose(dialog.id) }, [dialog.id, onClose])
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) closeDialogNow()
  }, [closeDialogNow])
  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return

    const handleMouseDown = (event: MouseEvent) => {
      if (event.target === overlay) mouseDownInsideContentRef.current = false
    }
    const handleClick = (event: MouseEvent) => {
      if (shouldCloseFromOverlayClick({ currentTarget: overlay, target: event.target }, dialog, mouseDownInsideContentRef.current)) {
        closeDialogFromBackground()
      }
    }

    overlay.addEventListener('mousedown', handleMouseDown)
    overlay.addEventListener('click', handleClick)
    return () => {
      overlay.removeEventListener('mousedown', handleMouseDown)
      overlay.removeEventListener('click', handleClick)
    }
  }, [closeDialogFromBackground, dialog])

  if (!readyToOpen) return null

  return (
    <DialogPrimitive.Root open onOpenChange={handleOpenChange}>
      <div
        ref={overlayRef}
        dir="ltr"
        className="tlui-dialog__overlay"
      >
        <TolariaTldrawDialogContent
          dialog={dialog}
          mouseDownInsideContentRef={mouseDownInsideContentRef}
          onClose={closeDialogNow}
        />
      </div>
    </DialogPrimitive.Root>
  )
})

function TolariaTldrawDialogs() {
  const { dialogs, removeDialog } = useDialogs()
  const requestedDialogs = useValue('tolaria tldraw dialogs', () => dialogs.get(), [dialogs])
  const [visibleDialogs, setVisibleDialogs] = useState<TLUiDialog[]>(() =>
    retainedTolariaTldrawDialogs.length > 0 ? retainedTolariaTldrawDialogs : dialogs.get()
  )

  const closeVisibleDialog = useCallback((id: string) => {
    const nextDialogs = retainedTolariaTldrawDialogs.filter((dialog) => dialog.id !== id)
    retainedTolariaTldrawDialogs = nextDialogs
    setVisibleDialogs(nextDialogs)
    removeDialog(id)
  }, [removeDialog])

  useEffect(() => {
    if (requestedDialogs.length === 0) return
    // tldraw clears the dialog atom while Radix closes the menu; keep the last requested dialog mounted locally.
    retainedTolariaTldrawDialogs = requestedDialogs
    queueMicrotask(() => {
      setVisibleDialogs(requestedDialogs)
    })
  }, [requestedDialogs])

  return visibleDialogs.map((dialog) => (
    <TolariaTldrawDialog
      key={dialog.id}
      dialog={dialog}
      onClose={closeVisibleDialog}
    />
  ))
}

function useFullscreenWhiteboard() {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (!fullscreen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false)
    }
    document.body.classList.add(WHITEBOARD_FULLSCREEN_BODY_CLASS)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove(WHITEBOARD_FULLSCREEN_BODY_CLASS)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [fullscreen])

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    })
    return () => { window.cancelAnimationFrame(animationFrameId) }
  }, [fullscreen])

  const toggleFullscreen = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setFullscreen((current) => !current)
  }, [])

  return { fullscreen, toggleFullscreen }
}

let cachedEmptySnapshotStruct: ReturnType<typeof getSnapshot>['document'] | null = null
let cachedEmptySnapshotJson: string = ''

function getEmptySnapshot(): {
  struct: ReturnType<typeof getSnapshot>['document']
  json: string
} {
  if (!cachedEmptySnapshotStruct) {
    let struct: ReturnType<typeof getSnapshot>['document']
    try {
      const emptyStore = createTLStore()
      struct = getSnapshot(emptyStore).document
    } catch {
      struct = { records: {} } as unknown as ReturnType<typeof getSnapshot>['document']
    }
    cachedEmptySnapshotStruct = struct
    cachedEmptySnapshotJson = serializeSnapshot(struct as unknown as TLStoreSnapshot)
  }
  return {
    struct: cachedEmptySnapshotStruct,
    json: cachedEmptySnapshotJson,
  }
}

export function TldrawWhiteboard({
  boardId,
  height,
  snapshot,
  width,
  readOnly = false,
  onSnapshotChange,
  onSizeChange,
}: TldrawWhiteboardProps) {
  const store = useMemo(() => createBoardStore(boardId), [boardId])
  const boardRef = useRef<HTMLDivElement | null>(null)
  const tldrawEditorRef = useRef<Editor | null>(null)
  const savedSnapshotRef = useRef<string | null>(null)
  const savedBoardIdRef = useRef<string | null>(null)
  const onSnapshotChangeRef = useRef(onSnapshotChange)
  const persistedSize = useMemo(() => normalizeSize({ height, width }), [height, width])
  const [resizingSize, setResizingSize] = useState<PixelSize | null>(null)
  const visibleSize = resizingSize ?? persistedSize
  const { fullscreen, toggleFullscreen } = useFullscreenWhiteboard()
  const locale = useDocumentLocale()
  const fullscreenLabel = translate(
    locale,
    fullscreen ? 'editor.whiteboard.exitFullscreen' : 'editor.whiteboard.enterFullscreen',
  )
  const themeMode = useDocumentThemeMode()
  const userPreferences = useMemo(() => tldrawUserPreferences(themeMode), [themeMode])
  const tldrawUser = useTldrawUser({
    setUserPreferences: ignoreTldrawUserPreferencesUpdate,
    userPreferences,
  })
  const tldrawUiComponents = useMemo(() => ({ Dialogs: TolariaTldrawDialogs }), [])

  const [showVocabMenu, setShowVocabMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const vocabEntries = _wikilinkEntriesRef.current.filter((e) => {
    const type = e.properties?.['card_type']
    const image = e.properties?.['image']
    return type === 'vocabulary' && typeof image === 'string' && image.trim().length > 0
  })

  const filteredVocabs = vocabEntries.filter(e =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleInsertVocabImage = useCallback(async (entry: VaultEntry) => {
    const editor = tldrawEditorRef.current
    if (!editor) return

    const imageProp = entry.properties?.['image']
    if (typeof imageProp !== 'string' || !imageProp.trim()) return

    const vaultPath = _activeVaultPathRef.current
    if (!vaultPath) return

    const assetUrl = vaultAttachmentAssetUrl({
      vaultPath,
      attachmentPath: imageProp,
    })

    const getImgSize = (url: string): Promise<{ w: number; h: number }> => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          resolve({ w: img.naturalWidth || 300, h: img.naturalHeight || 300 })
        }
        img.onerror = () => {
          resolve({ w: 300, h: 300 })
        }
        img.src = url
      })
    }

    const { w, h } = await getImgSize(assetUrl)
    const assetId = AssetRecordType.createId()

    editor.createAssets([
      {
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: {
          name: entry.title,
          src: assetUrl,
          w,
          h,
          mimeType: 'image/png',
          isAnimated: false,
        },
        meta: {},
      }
    ])

    const shapeId = createShapeId()
    const center = editor.getViewportPageBounds().center

    editor.createShapes([
      {
        id: shapeId,
        type: 'image',
        x: center.x - w / 2,
        y: center.y - h / 2,
        props: {
          assetId,
          w,
          h,
        }
      }
    ])

    setShowVocabMenu(false)
    setSearchQuery('')
  }, [])

  useEffect(() => {
    return () => {
      tldrawEditorRef.current = null
    }
  }, [])

  const normalizedSnapshot = useMemo(() => {
    const trimmed = snapshot.trim()
    return trimmed === '{}' ? '' : trimmed
  }, [snapshot])

  useEffect(() => {
    onSnapshotChangeRef.current = onSnapshotChange
  }, [onSnapshotChange])

  useEffect(() => {
    if (boardId === savedBoardIdRef.current && normalizedSnapshot === (savedSnapshotRef.current ?? '')) return

    const parsed = parseSnapshot(normalizedSnapshot)
    if (parsed) {
      try {
        loadSnapshot(store, parsed)
        savedBoardIdRef.current = boardId
        savedSnapshotRef.current = normalizedSnapshot
        return
      } catch {
        // Fall through to an empty board when legacy or hand-edited JSON is invalid.
      }
    }

    const { struct } = getEmptySnapshot()
    loadSnapshot(store, struct)
    savedBoardIdRef.current = boardId
    savedSnapshotRef.current = normalizedSnapshot
  }, [boardId, normalizedSnapshot, store])

  useEffect(() => {
    if (readOnly) return
    let timeoutId: number | null = null

    const flushSnapshot = () => {
      timeoutId = null
      const nextSnapshot = serializeSnapshot(getSnapshot(store).document)
      const currentSaved = savedSnapshotRef.current ?? ''

      if (nextSnapshot.trim() === currentSaved.trim()) return

      const { json: emptyJson } = getEmptySnapshot()
      const isNextEmpty = nextSnapshot.trim() === emptyJson.trim()
      const isSavedEmpty = !currentSaved.trim() || currentSaved.trim() === '{}'
      if (isNextEmpty && isSavedEmpty) return

      savedBoardIdRef.current = boardId
      savedSnapshotRef.current = nextSnapshot
      onSnapshotChangeRef.current(nextSnapshot)
    }

    const scheduleSnapshotFlush = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(flushSnapshot, 350)
    }

    const cleanup = store.listen(scheduleSnapshotFlush, { source: 'user', scope: 'document' })
    return () => {
      cleanup()
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [boardId, store, readOnly])

  const startResize = (mode: ResizeMode) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const rect = boardRef.current?.getBoundingClientRect()
    const start: ResizeStart = {
      height: visibleSize.height,
      pointerX: event.clientX,
      pointerY: event.clientY,
      width: visibleSize.width ?? rect?.width ?? MIN_WIDTH,
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextSize = {
        height: mode === 'width' ? start.height : start.height + moveEvent.clientY - start.pointerY,
        width: mode === 'height' ? visibleSize.width : start.width + moveEvent.clientX - start.pointerX,
      }
      setResizingSize(normalizeSize(sizeToProps(nextSize)))
    }

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)

      const finalSize = {
        height: mode === 'width' ? start.height : start.height + upEvent.clientY - start.pointerY,
        width: mode === 'height' ? visibleSize.width : start.width + upEvent.clientX - start.pointerX,
      }
      const nextProps = sizeToProps(normalizeSize(sizeToProps(finalSize)))
      setResizingSize(null)
      onSizeChange(nextProps)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp, { once: true })
  }

  const handleMount = useCallback((editor: Editor) => {
    tldrawEditorRef.current = editor
    if (readOnly) {
      editor.updateInstanceState({ isReadonly: true })
    }
    return installWhiteboardRuntimeGuards(editor)
  }, [readOnly])

  return (
    <div
      ref={boardRef}
      className={fullscreen ? 'tldraw-whiteboard tldraw-whiteboard--fullscreen' : 'tldraw-whiteboard'}
      contentEditable={false}
      data-board-id={boardId}
      style={cssSize(visibleSize)}
    >
      <Tldraw
        assetUrls={tldrawAssetUrls}
        components={tldrawUiComponents}
        key={boardId}
        onMount={handleMount}
        store={store}
        user={tldrawUser}
      />
      {!readOnly && (
        <div className="absolute top-2 right-12 z-[90] flex items-center gap-2">
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs bg-background shadow-md border border-border"
              onClick={() => setShowVocabMenu(prev => !prev)}
            >
              <Plus size={12} className="mr-1" />
              Vocab Image
            </Button>
            {showVocabMenu && (
              <div className="absolute right-0 top-8 w-64 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-50 p-2 flex flex-col gap-2">
                <Input
                  placeholder="Search vocabulary..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs focus-visible:ring-1"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                  {filteredVocabs.map((entry) => (
                    <button
                      key={entry.path}
                      type="button"
                      onClick={() => handleInsertVocabImage(entry)}
                      className="text-left text-xs px-2 py-1.5 hover:bg-accent hover:text-accent-foreground rounded transition-colors truncate w-full"
                    >
                      {entry.title}
                    </button>
                  ))}
                  {filteredVocabs.length === 0 && (
                    <div className="text-[10px] text-muted-foreground p-2 text-center">
                      No vocabulary notes found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <ActionTooltip copy={{ label: fullscreenLabel }} side="left">
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          aria-label={fullscreenLabel}
          aria-pressed={fullscreen}
          className="tldraw-whiteboard__fullscreen-button"
          data-testid="tldraw-whiteboard-fullscreen-toggle"
          title={fullscreenLabel}
          onClick={toggleFullscreen}
        >
          {fullscreen ? <ArrowsIn aria-hidden="true" /> : <ArrowsOut aria-hidden="true" />}
        </Button>
      </ActionTooltip>
      {!readOnly && (
        <>
          <button
            type="button"
            aria-label="Resize whiteboard width"
            className="tldraw-whiteboard__resize-handle tldraw-whiteboard__resize-handle--width border-0 bg-transparent p-0"
            onPointerDown={startResize('width')}
          />
          <button
            type="button"
            aria-label="Resize whiteboard height"
            className="tldraw-whiteboard__resize-handle tldraw-whiteboard__resize-handle--height border-0 bg-transparent p-0"
            onPointerDown={startResize('height')}
          />
          <button
            type="button"
            aria-label="Resize whiteboard"
            className="tldraw-whiteboard__resize-handle tldraw-whiteboard__resize-handle--corner border-0 bg-transparent p-0"
            onPointerDown={startResize('both')}
          />
        </>
      )}
    </div>
  )
}
