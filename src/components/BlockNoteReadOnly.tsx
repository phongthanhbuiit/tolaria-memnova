import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BlockNoteViewRaw, ComponentsContext, useCreateBlockNote } from '@blocknote/react'
import { components } from '@blocknote/mantine'
import { MantineProvider } from '@mantine/core'
import { useDocumentThemeMode } from '../hooks/useDocumentThemeMode'
import { getRuntimeStyleNonce } from '../lib/runtimeStyleNonce'
import { useEditorTheme } from '../hooks/useTheme'
import { schema } from './editorSchema'
import { createArrowLigaturesExtension } from './arrowLigaturesExtension'
import { createMathInputExtension } from './mathInputExtension'
import { preProcessDurableEditorMarkdown, injectDurableEditorMarkdownBlocks } from '../utils/editorDurableMarkdown'
import { resolveImageUrls } from '../utils/vaultImages'
import { preProcessWikilinks, injectWikilinks } from '../utils/wikilinks'
import { preProcessMathMarkdown, injectMathInBlocks } from '../utils/mathMarkdown'
import { translate, type AppLocale } from '../lib/i18n'
import { useRegisterEditorResources } from './useEditorResources'
import { DocumentRenderBoundary } from './DocumentRenderBoundary'
import { documentCanvasIds, type DocumentRenderStatus } from './documentRenderGate'
import type { NoteMediaDependency } from '../lib/learning/types'
import { createVerifiedNoteMedia, prepareNoteRenderBlocks, noteRenderMedia } from '../lib/learning/verifiedNoteMedia'
import { watchNoteMedia } from '../lib/learning/noteMediaReadiness'
import './EditorTheme.css'
interface BlockNoteReadOnlyProps {
  content: string
  verifiedMedia?: readonly NoteMediaDependency[]
  vaultPath?: string | null
  notePath?: string
  onImageClick?: (src: string) => void
  preserveBody?: boolean
  onReady?: () => void
  onRenderStatus?: (status: DocumentRenderStatus) => void
  locale?: AppLocale
}
export function BlockNoteReadOnly(props: BlockNoteReadOnlyProps) {
  const { verifiedMedia,content,vaultPath,notePath,onImageClick,preserveBody = false,locale = 'en',onReady,onRenderStatus } = props
  const theme = useDocumentThemeMode()
  const { cssVars } = useEditorTheme()
  const editor = useCreateBlockNote({
    schema,
    _tiptapOptions: { injectNonce: getRuntimeStyleNonce() },
    extensions: [createArrowLigaturesExtension(), createMathInputExtension()],
  })
  const verified = useMemo(() => {
    if (!verifiedMedia) return null
    try { return { resolve: createVerifiedNoteMedia(vaultPath ?? '', verifiedMedia), error: false } }
    catch { return { resolve: () => null, error: true } }
  }, [verifiedMedia,vaultPath])
  const resolveVerified = verified?.resolve
  useRegisterEditorResources(editor,vaultPath ?? undefined,notePath,undefined,resolveVerified)
  const [prevContent, setPrevContent] = useState(content)
  const [ready, setReady] = useState(false)
  const [renderError, setRenderError] = useState(false)
  const [renderDocument,setRenderDocument] = useState<{ ids: string[]; notify: (status: DocumentRenderStatus) => void } | null>(null)
  const statusRef = useRef(onRenderStatus)
  useEffect(() => { statusRef.current = onRenderStatus },[onRenderStatus])
  const onReadyRef = useRef(onReady)
  useEffect(() => { onReadyRef.current = onReady }, [onReady])

  if (content !== prevContent) {
    setPrevContent(content)
    setReady(false)
  }

  useEffect(() => {
    let cancelled = false
    let stopMedia = () => {}
    let mediaStatus: DocumentRenderStatus = resolveVerified ? 'loading' : 'ready'
    let documentStatus: DocumentRenderStatus = 'loading'
    let previousStatus: DocumentRenderStatus | null = null
    const report = () => {
      if (cancelled) return
      const status = mediaStatus === 'error' || documentStatus === 'error' ? 'error' : mediaStatus === 'ready' && documentStatus === 'ready' ? 'ready' : 'loading'
      if (status === previousStatus) return
      previousStatus = status
      statusRef.current?.(status)
      if (status === 'ready') onReadyRef.current?.()
    }
    report()

    // Strip frontmatter before parsing
    const body = preserveBody ? content : content.replace(/^---[\s\S]*?---\n?/m, '').trim()

    const parseAndSetBlocks = async () => {
      try {
        setRenderError(false)
        if (verified?.error) throw Error('invalid-verified-note-media')
        // Preprocess markdown
        const withDurableBlocks = preProcessDurableEditorMarkdown({ markdown: body })
        const withImages = vaultPath && !resolveVerified ? resolveImageUrls(withDurableBlocks, vaultPath, notePath) : withDurableBlocks
        const withWikilinks = preProcessWikilinks(withImages)
        const preprocessed = preProcessMathMarkdown({ markdown: withWikilinks })

        const blocks = await Promise.resolve(editor.tryParseMarkdownToBlocks(preprocessed))

        if (cancelled) return

        let safeBlocks = blocks && blocks.length > 0
          ? blocks
          : [{ type: 'paragraph' as const, content: [] }]

        // Inject custom structures
        const withWikilinksInBlocks = injectWikilinks(safeBlocks)
        const withMathInBlocks = injectMathInBlocks(withWikilinksInBlocks)
        safeBlocks = injectDurableEditorMarkdownBlocks(withMathInBlocks) as typeof safeBlocks

        if (resolveVerified) {
          safeBlocks = prepareNoteRenderBlocks(safeBlocks, resolveVerified) as typeof safeBlocks
          stopMedia = watchNoteMedia(noteRenderMedia(safeBlocks, resolveVerified), status => { mediaStatus = status; report() })
        }
        editor.replaceBlocks(editor.document, safeBlocks)
        if (!cancelled) {
          setRenderDocument({ ids: documentCanvasIds(safeBlocks), notify: status => {
            if (cancelled) return
            documentStatus = status; report()
          } })
          setReady(true)
        }
      } catch (err) {
        console.error('[Flashcard] Failed to parse markdown or replace blocks in BlockNoteReadOnly:', err)
        if (!cancelled) { setRenderError(true); setReady(true); statusRef.current?.('error') }
      }
    }

    parseAndSetBlocks()

    return () => {
      cancelled = true
      stopMedia()
    }
  }, [content, editor, vaultPath, notePath, preserveBody,resolveVerified,verified])

  if (!ready) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
        <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
        {translate(locale, 'learning.loading')}
      </div>
    )
  }

  if (renderError) return <pre className="whitespace-pre-wrap break-words text-sm">{content}</pre>

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'IMG') {
      const src = target.getAttribute('src')
      if (src && onImageClick) {
        onImageClick(src)
      }
    }
  }

  const view = (
    <DocumentRenderBoundary ids={renderDocument?.ids ?? []} onStatus={renderDocument?.notify ?? (() => {})}>
    <ComponentsContext.Provider value={components}>
      <BlockNoteViewRaw
        editor={editor}
        editable={false}
        className="bn-mantine"
        data-mantine-color-scheme={theme === 'dark' ? 'dark' : 'light'}
        theme={theme}
      />
    </ComponentsContext.Provider>
    </DocumentRenderBoundary>
  )

  return (
    // cssVars injects all theme CSS custom properties (--colors-text, --headings-h1-color, etc.)
    // exactly like SingleEditorView does, so EditorTheme.css selectors get the correct values.
    <div
      className="editor__blocknote-container [&_.bn-editor]:px-0 [&_.bn-editor]:py-0 [&_.bn-block-outer:first-child_.bn-block-content]:pt-0 cursor-pointer"
      style={cssVars as React.CSSProperties}
      onClick={handleEditorClick}
      onErrorCapture={event => {
        if (resolveVerified && (event.target instanceof HTMLImageElement || event.target instanceof HTMLMediaElement)) renderDocument?.notify('error')
      }}
    >
      <MantineProvider
        withCssVariables={false}
        getStyleNonce={getRuntimeStyleNonce}
        getRootElement={() => undefined}
      >
        {view}
      </MantineProvider>
    </div>
  )
}

