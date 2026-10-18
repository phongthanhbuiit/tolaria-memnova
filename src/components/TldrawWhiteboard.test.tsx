import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Editor } from 'tldraw'
import { registerEditorResources } from './editorResourceScope'
import { _activeVaultPathRef, _wikilinkEntriesRef } from './editorSchema'
import { DocumentRenderBoundary } from './DocumentRenderBoundary'
import { flushEditorDocuments } from '../utils/editorDocumentFlush'
import { TldrawWhiteboard } from './TldrawWhiteboard'
import { TooltipProvider } from './ui/tooltip'

interface MockTldrawProps {
  assetUrls: MockAssetUrls
  onMount: (editor: Editor) => () => void
  user?: MockTldrawUser
}

interface MockTldrawUser {
  userPreferences: {
    get: () => { colorScheme?: string }
  }
}

interface MockAssetUrls {
  embedIcons: Record<string, string>
  fonts: Record<string, string>
  icons: Record<string, string>
  translations: Record<string, string>
}

const tldrawMock = vi.hoisted(() => ({
  Tldraw: vi.fn(),
}))

const tldrawStoreMock = vi.hoisted(() => ({
  createTLStore: vi.fn(() => ({
    document: { records: {} },
    getStoreSnapshot() { return this.document },
    listen: vi.fn((listener: () => void) => { void listener; return vi.fn() }),
  })),
  getSnapshot: vi.fn((store: { document?: unknown }) => ({ document: store.document ?? { records: {} } })),
  loadSnapshot: vi.fn((store: { document?: unknown }, snapshot: unknown) => {
    store.document = snapshot
  }),
}))

const assetImportMock = vi.hoisted(() => ({
  getAssetUrlsByImport: vi.fn((formatAssetUrl: (assetUrl?: string) => string) => ({
    embedIcons: {},
    fonts: {
      tldraw_draw: formatAssetUrl('/assets/Shantell_Sans-Informal_Regular.woff2'),
    },
    icons: {
      'tool-pencil': `${formatAssetUrl('/assets/0_merged.svg')}#tool-pencil`,
    },
    translations: {
      en: formatAssetUrl(undefined),
    },
  })),
}))

vi.mock('@tldraw/assets/imports.vite', () => assetImportMock)
vi.mock('@tauri-apps/api/core', async importOriginal => ({ ...await importOriginal<typeof import('@tauri-apps/api/core')>(),convertFileSrc: (path: string) => `asset://localhost${encodeURI(path)}` }))

vi.mock('tldraw', async () => {
  const { createElement } = await import('react')

  tldrawMock.Tldraw.mockImplementation(({ assetUrls }: MockTldrawProps) =>
    createElement('div', {
      'data-testid': 'mock-tldraw',
      'data-draw-font-url': assetUrls.fonts.tldraw_draw,
    })
  )

  return {
    Box: class Box {
      x: number
      y: number
      w: number
      h: number

      constructor(x: number, y: number, w: number, h: number) {
        this.x = x
        this.y = y
        this.w = w
        this.h = h
      }
    },
    AssetRecordType: { createId: () => 'asset:test' },
    createShapeId: () => 'shape:test',
    Tldraw: tldrawMock.Tldraw,
    createTLStore: tldrawStoreMock.createTLStore,
    defaultUserPreferences: {
      colorScheme: 'light',
      locale: 'en',
    },
    getSnapshot: tldrawStoreMock.getSnapshot,
    loadSnapshot: tldrawStoreMock.loadSnapshot,
    useTldrawUser: vi.fn(({ userPreferences }: { userPreferences: { colorScheme: string } }) => ({
      setUserPreferences: vi.fn(),
      userPreferences: {
        get: () => userPreferences,
      },
    })),
  }
})

function renderedTldrawAssetUrls(): MockAssetUrls {
  const props = tldrawMock.Tldraw.mock.calls[0]?.[0] as MockTldrawProps
  expect(props.assetUrls).toBeDefined()
  return props.assetUrls
}

function renderedTldrawProps(): MockTldrawProps {
  const props = tldrawMock.Tldraw.mock.lastCall?.[0] as MockTldrawProps
  expect(props).toBeDefined()
  return props
}

function mountBoardEditor(editor: Editor): () => void {
  let dispose = () => {}
  act(() => { dispose = renderedTldrawProps().onMount(editor) })
  return () => { act(() => { dispose() }) }
}

function mockEditor(): Editor {
  const container = document.createElement('div')
  const canvas = document.createElement('div')
  canvas.className = 'tl-canvas'
  container.append(canvas)

  return {
    dispatch: vi.fn(),
    updateInstanceState: vi.fn(),
    registerExternalContentHandler: vi.fn(),
    options: { maxFilesAtOnce: 100 },
    getContainer: vi.fn(() => container),
    textMeasure: {
      measureElementTextNodeSpans: vi.fn(() => {
        throw new TypeError("Cannot read properties of undefined (reading 'top')")
      }),
    },
    updateViewportScreenBounds: vi.fn(),
  } as unknown as Editor
}

function dispatchUnhandledRejection(reason: unknown): Event {
  const event = new Event('unhandledrejection', { cancelable: true })
  Object.defineProperty(event, 'reason', { value: reason })
  window.dispatchEvent(event)
  return event
}

function measuredTextElement(): HTMLElement {
  const element = document.createElement('div')
  element.textContent = 'Label'
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({
    height: 24,
    width: 88,
  }))
  return element
}

function expectNoCdnUrls(urls: Record<string, string>) {
  Object.values(urls).forEach((url) => {
    expect(url).not.toContain('cdn.tldraw.com')
  })
}

function expectBundledTldrawAssetUrls(assetUrls: MockAssetUrls) {
  expect(assetUrls.fonts.tldraw_draw).toContain('Shantell_Sans-Informal_Regular.woff2')
  expect(assetUrls.icons['tool-pencil']).toContain('0_merged.svg#tool-pencil')
  expect(assetUrls.translations.en).toBe('data:application/json;base64,e30K')
  expectNoCdnUrls(assetUrls.fonts)
  expectNoCdnUrls(assetUrls.icons)
  expectNoCdnUrls(assetUrls.translations)
}

function whiteboardProps(
  overrides: Partial<ComponentProps<typeof TldrawWhiteboard>> = {},
): ComponentProps<typeof TldrawWhiteboard> {
  return {
    boardId: 'board-1',
    height: '520',
    snapshot: '',
    width: '',
    onSizeChange: vi.fn(),
    onSnapshotChange: vi.fn(),
    ...overrides,
  }
}

async function renderWhiteboard(overrides: Partial<ComponentProps<typeof TldrawWhiteboard>> = {}) {
  const result = render(
    <TldrawWhiteboard {...whiteboardProps(overrides)} />,
    { wrapper: TooltipProvider },
  )
  await act(async () => { await Promise.resolve() })
  return result
}

it('offers keyboard resizing without writing a snapshot or changing the other dimension', async () => {
  const onSizeChange = vi.fn(), onSnapshotChange = vi.fn()
  await renderWhiteboard({ width: '600', height: '520', onSizeChange, onSnapshotChange })
  fireEvent.keyDown(screen.getByRole('button', { name: 'Resize whiteboard height', exact: true }), { key: 'ArrowDown' })
  expect(onSizeChange).toHaveBeenCalledWith({ width: '600', height: '528' })
  expect(onSnapshotChange).not.toHaveBeenCalled()
})

it('localizes vocabulary actions, search and empty state using the document locale', async () => {
  const previous = document.documentElement.lang
  document.documentElement.lang = 'vi'
  try {
    await renderWhiteboard()
    fireEvent.click(screen.getByRole('button', { name: 'Ảnh từ vựng' }))
    expect(screen.getByRole('textbox', { name: 'Tìm từ vựng…' })).toBeInTheDocument()
    expect(screen.getByText('Không tìm thấy ghi chú từ vựng')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đổi chiều cao bảng vẽ' })).toBeInTheDocument()
  } finally { cleanup(); document.documentElement.lang = previous }
})

describe('TldrawWhiteboard', () => {
  afterEach(() => {
    cleanup()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
    vi.clearAllMocks()
  })

  it('uses bundled tldraw assets instead of CDN URLs', async () => {
    await renderWhiteboard()

    expect(screen.getByTestId('mock-tldraw')).toHaveAttribute('data-draw-font-url')
    expect(assetImportMock.getAssetUrlsByImport).toHaveBeenCalledWith(expect.any(Function))
    expectBundledTldrawAssetUrls(renderedTldrawAssetUrls())
  })

  it('passes Tolaria dark mode to tldraw', async () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    document.documentElement.classList.add('dark')

    await renderWhiteboard()

    expect(renderedTldrawProps().user?.userPreferences.get().colorScheme).toBe('dark')
  })

  it('updates the tldraw color scheme when Tolaria theme changes', async () => {
    document.documentElement.setAttribute('data-theme', 'light')

    await renderWhiteboard()

    expect(renderedTldrawProps().user?.userPreferences.get().colorScheme).toBe('light')

    act(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.documentElement.classList.add('dark')
    })

    await waitFor(() => {
      expect(renderedTldrawProps().user?.userPreferences.get().colorScheme).toBe('dark')
    })
  })

  it('installs the text measurement guard when the canvas mounts', async () => {
    await renderWhiteboard()

    const editor = mockEditor()
    const cleanup = mountBoardEditor(editor)

    expect(editor.textMeasure.measureElementTextNodeSpans(measuredTextElement())).toEqual({
      didTruncate: false,
      spans: [{
        box: { h: 24, w: 88, x: 0, y: 0 },
        text: 'Label',
      }],
    })

    cleanup()
    expect(() => editor.textMeasure.measureElementTextNodeSpans(measuredTextElement())).toThrow('top')
  })

  it('suppresses whiteboard platform permission rejections while mounted', async () => {
    await renderWhiteboard()

    const cleanup = mountBoardEditor(mockEditor())
    const denied = {
      name: 'NotAllowedError',
      message: 'The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.',
    }

    expect(dispatchUnhandledRejection(denied).defaultPrevented).toBe(true)
    expect(dispatchUnhandledRejection(new Error('save failed')).defaultPrevented).toBe(false)

    cleanup()
    expect(dispatchUnhandledRejection(denied).defaultPrevented).toBe(false)
  })

  it('resets the drawing store when switching to a blank board snapshot', async () => {
    const boardASnapshot = { records: { shape: 'from-board-a' } }
    const { rerender } = await renderWhiteboard({ snapshot: JSON.stringify(boardASnapshot) })

    expect(tldrawStoreMock.loadSnapshot).toHaveBeenLastCalledWith(expect.any(Object), boardASnapshot)

    rerender(
      <TldrawWhiteboard {...whiteboardProps({ boardId: 'board-2' })} />
    )

    await waitFor(() => expect(tldrawStoreMock.loadSnapshot).toHaveBeenLastCalledWith(expect.any(Object), { records: {} }))
  })
})

it('retains the last document stroke when unmounted before the snapshot debounce', async () => {
  vi.useFakeTimers()
  try {
    const onSnapshotChange = vi.fn()
    const view = await renderWhiteboard({ onSnapshotChange })
    const store = tldrawStoreMock.loadSnapshot.mock.lastCall![0] as ReturnType<typeof tldrawStoreMock.createTLStore>
    const listener = store.listen.mock.lastCall![0]
    act(() => { store.document = { records: { 'shape:last': { typeName: 'shape', text: 'last stroke' } } }; listener() })
    act(() => { vi.advanceTimersByTime(349) })
    expect(onSnapshotChange).not.toHaveBeenCalled()
    view.unmount()
    expect(onSnapshotChange).toHaveBeenCalledTimes(1)
    expect(JSON.parse(onSnapshotChange.mock.calls[0][0]).records['shape:last'].text).toBe('last stroke')
    act(() => { vi.runOnlyPendingTimers() })
    expect(onSnapshotChange).toHaveBeenCalledTimes(1)
  } finally { vi.useRealTimers() }
})

it('flushes the scoped board synchronously without a delayed duplicate callback', async () => {
  vi.useFakeTimers()
  try {
    const owner = {}, onSnapshotChange = vi.fn()
    const view = await renderWhiteboard({ documentScope: owner,blockId: 'block-a',onSnapshotChange })
    const store = tldrawStoreMock.loadSnapshot.mock.lastCall![0] as ReturnType<typeof tldrawStoreMock.createTLStore>
    act(() => { store.document = { records: { 'shape:last': { text: 'saved now' } } }; store.listen.mock.lastCall![0]() })
    act(() => { expect(flushEditorDocuments(owner)).toBe(true) })
    expect(JSON.parse(onSnapshotChange.mock.calls[0][0]).records['shape:last'].text).toBe('saved now')
    act(() => { vi.advanceTimersByTime(500) })
    expect(onSnapshotChange).toHaveBeenCalledTimes(1)
    view.unmount(); expect(flushEditorDocuments(owner)).toBe(false)
  } finally { vi.useRealTimers() }
})
it('never registers a write producer or emits a snapshot for a read-only board', async () => {
  const owner = {}, onSnapshotChange = vi.fn(), view = await renderWhiteboard({ documentScope: owner,blockId: 'read-only',readOnly: true,onSnapshotChange })
  expect(flushEditorDocuments(owner)).toBe(false)
  view.unmount(); expect(onSnapshotChange).not.toHaveBeenCalled()
})

it.each(['{broken', 'null', '[1,2]'])('keeps invalid snapshot bytes visible without replacing them with a blank canvas: %s', async snapshot => {
  const onSnapshotChange = vi.fn(), view = await renderWhiteboard({ snapshot,onSnapshotChange })
  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(screen.getByText(snapshot,{selector: 'pre'}).textContent).toBe(snapshot)
  expect(screen.queryByTestId('mock-tldraw')).not.toBeInTheDocument()
  view.unmount(); expect(onSnapshotChange).not.toHaveBeenCalled()
})
it('retains unsupported snapshots when tldraw rejects loading them', async () => {
  const snapshot = '{"schema":{"schemaVersion":999},"store":{"shape:kept":{"text":"keep me"}}}'
  tldrawStoreMock.loadSnapshot.mockImplementationOnce(() => { throw Error('unsupported snapshot') })
  const onSnapshotChange = vi.fn(), view = await renderWhiteboard({ snapshot,onSnapshotChange })
  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(screen.getByText(snapshot,{selector: 'pre'}).textContent).toBe(snapshot)
  view.unmount(); expect(onSnapshotChange).not.toHaveBeenCalled()
})

it('does not signal a readable canvas until tldraw has mounted after a successful load', async () => {
  const status = vi.fn()
  const view = render(<TooltipProvider><DocumentRenderBoundary ids={['canvas']} onStatus={status}><TldrawWhiteboard {...whiteboardProps({ blockId: 'canvas',readOnly: true })} /></DocumentRenderBoundary></TooltipProvider>)
  await act(async () => { await Promise.resolve() })
  expect(status).toHaveBeenLastCalledWith('loading')
  let dispose: () => void = () => {}
  act(() => { dispose = renderedTldrawProps().onMount(mockEditor()) })
  expect(status).toHaveBeenLastCalledWith('ready')
  act(() => { dispose() }); view.unmount()
})
it('can retry a rejected snapshot without publishing an empty replacement', async () => {
  const snapshot = '{"records":{"shape:retained":{"text":"recover"}}}', onSnapshotChange = vi.fn()
  tldrawStoreMock.loadSnapshot.mockImplementationOnce(() => { throw Error('unsupported snapshot') })
  const view = await renderWhiteboard({ snapshot,onSnapshotChange })
  expect(screen.getByText(snapshot,{selector:'pre'}).textContent).toBe(snapshot)
  await act(async () => { screen.getByRole('button',{name:'Retry'}).click(); await Promise.resolve() })
  expect(screen.getByTestId('mock-tldraw')).toBeInTheDocument()
  expect(tldrawStoreMock.loadSnapshot).toHaveBeenLastCalledWith(expect.any(Object),JSON.parse(snapshot))
  view.unmount(); expect(onSnapshotChange).not.toHaveBeenCalled()
})

it('keeps an explicit way to exit fullscreen when a replacement snapshot fails', async () => {
  const view = await renderWhiteboard()
  fireEvent.click(screen.getByRole('button',{name:'Expand whiteboard'}))
  view.rerender(<TldrawWhiteboard {...whiteboardProps({snapshot:'{corrupt'})} />)
  const error = await screen.findByRole('alert')
  expect(error).toHaveClass('tldraw-whiteboard--fullscreen')
  fireEvent.click(screen.getByRole('button',{name:'Exit fullscreen whiteboard'}))
  expect(document.body).not.toHaveClass('tldraw-whiteboard-fullscreen-open')
  view.unmount()
})

it('does not insert a vocabulary image after the board has been unmounted', async () => {
  const previousRoot = _activeVaultPathRef.current, previousEntries = _wikilinkEntriesRef.current
  let completeImage = () => {}, imageStarted = false
  vi.stubGlobal('Image',class {
    naturalWidth = 300; naturalHeight = 200; src = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null
    constructor() { imageStarted = true; completeImage = () => this.onload?.() }
  })
  _activeVaultPathRef.current = '/qa/old'
  _wikilinkEntriesRef.current = [{ path:'/qa/old/vocab.md',title:'Selected vocabulary',properties:{card_type:'vocabulary',image:'attachments/image.png'} } as never]
  const editor = Object.assign(mockEditor(),{ createAssets: vi.fn(),createShapes: vi.fn(),getViewportPageBounds: () => ({center:{x:0,y:0}}) })
  try {
    const scope = {}, visit = registerEditorResources(scope,'/qa/old','/qa/old/owner.md')
    const view = await renderWhiteboard({ documentScope: scope,blockId: 'board' })
    let dispose = () => {}
    act(() => { dispose = renderedTldrawProps().onMount(editor) })
    fireEvent.click(screen.getByRole('button',{name:'Vocabulary image'}))
    fireEvent.click(screen.getByRole('button',{name:'Selected vocabulary'}))
    await act(async () => { await Promise.resolve() })
    expect(imageStarted).toBe(true)
    act(() => { dispose() }); view.unmount()
    await act(async () => { completeImage(); await Promise.resolve() })
    expect(editor.createAssets).not.toHaveBeenCalled()
    visit.dispose()
  } finally {
    _activeVaultPathRef.current = previousRoot; _wikilinkEntriesRef.current = previousEntries; vi.unstubAllGlobals()
  }
})
it('captures an immediate save even before tldraw delivers its buffered document event',async()=>{
  const owner={}, onSnapshotChange=vi.fn(), view=await renderWhiteboard({documentScope:owner,blockId:'buffered',onSnapshotChange})
  const store=tldrawStoreMock.loadSnapshot.mock.lastCall![0] as ReturnType<typeof tldrawStoreMock.createTLStore>
  expect(flushEditorDocuments(owner)).toBe(false)
  store.document={records:{'shape:buffered':{text:'must save now'}}}
  act(()=>{expect(flushEditorDocuments(owner)).toBe(true)})
  expect(JSON.parse(onSnapshotChange.mock.calls[0][0]).records['shape:buffered'].text).toBe('must save now')
  view.unmount()
})

it.each(['cancel', 'unmount'])('discards resize listeners on %s without a late dimension write', async action => {
  const onSizeChange = vi.fn()
  const view = await renderWhiteboard({ onSizeChange })
  fireEvent(screen.getByRole('button', { name: 'Resize whiteboard width', exact: true }), new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }))
  if (action === 'cancel') fireEvent(window, new MouseEvent('pointercancel'))
  else view.unmount()
  fireEvent(window, new MouseEvent('pointermove', { clientX: 160, clientY: 100 }))
  fireEvent(window, new MouseEvent('pointerup', { clientX: 160, clientY: 100 }))
  expect(onSizeChange).not.toHaveBeenCalled()
  if (action === 'cancel') view.unmount()
})

it('converts automatic canvas width to document pixels before keyboard resizing at app zoom', async () => {
  const onSizeChange = vi.fn()
  const readStyle = document.documentElement.style.getPropertyValue.bind(document.documentElement.style)
  const zoomRead = vi.spyOn(document.documentElement.style, 'getPropertyValue').mockImplementation(name => name === 'zoom' ? '150%' : readStyle(name))
  try {
    const view = await renderWhiteboard({ width: '', height: '520', onSizeChange })
    const board = view.container.querySelector('.tldraw-whiteboard')!
    const measurement = vi.spyOn(board, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 900, 780))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Resize whiteboard width', exact: true }), { key: 'ArrowRight' })
    expect(onSizeChange).toHaveBeenCalledWith({ width: '608', height: '520' })
    measurement.mockRestore()
    view.unmount()
  } finally { zoomRead.mockRestore() }
})
