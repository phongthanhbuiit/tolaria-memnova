/**
 * FlashcardStudyView.tsx
 *
 * Full-screen study session overlay. Renders one flashcard at a time,
 * supports flip animation, keyboard shortcuts, and FSRS rating buttons.
 *
 * Props:
 *  - entries:      All due FSRS entries to review
 *  - onRate:       Called when the user rates a card (triggers FSRS update + advance)
 *  - onClose:      Called when the session ends or user dismisses
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { invoke } from '@tauri-apps/api/core'
import { Books, CalendarBlank, Confetti, Sparkle, X } from '@phosphor-icons/react'
import './EditorTheme.css'
import {
  BlockNoteViewRaw,
  ComponentsContext,
  useCreateBlockNote,
} from '@blocknote/react'
import { components } from '@blocknote/mantine'
import { MantineProvider } from '@mantine/core'
import { cn } from '@/lib/utils'
import { splitFlashcardContent } from '../utils/flashcardMarkdown'
import { getCachedNoteContentEntry } from '../hooks/noteContentCache'
import { getFSRSCard } from '../lib/fsrsVaultEntry'
import { fsrsPreviewIntervals } from '../lib/fsrs'
import { useDocumentThemeMode } from '../hooks/useDocumentThemeMode'
import { getRuntimeStyleNonce } from '../lib/runtimeStyleNonce'
import { useEditorTheme } from '../hooks/useTheme'
import type { FSRSRating } from '../lib/fsrs'
import type { VaultEntry } from '../types'
import { schema } from './editorSchema'
import { createArrowLigaturesExtension } from './arrowLigaturesExtension'
import { createMathInputExtension } from './mathInputExtension'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FlashcardStudyViewProps {
  /** Ordered queue of entries to study */
  entries: VaultEntry[]
  /** Called when user rates the current card */
  onRate: (entry: VaultEntry, rating: FSRSRating) => void
  /** Called when session ends (X button, Escape, or queue exhausted) */
  onClose: () => void
  /** Optional deck name to display in the session header */
  deckName?: string
}

type RatingLabel = { label: string; emoji: string; color: string; key: string }

const RATING_CONFIG: Record<FSRSRating, RatingLabel> = {
  1: { label: 'Again', emoji: '😰', color: 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20', key: '1' },
  2: { label: 'Hard', emoji: '😓', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30 hover:bg-orange-500/20', key: '2' },
  3: { label: 'Good', emoji: '😊', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20', key: '3' },
  4: { label: 'Easy', emoji: '😄', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500/20', key: '4' },
}

// ---------------------------------------------------------------------------
// Read-only BlockNote view (pixel-perfect match with the main editor)
// ---------------------------------------------------------------------------

/**
 * Renders markdown content using the same BlockNote renderer as the main editor,
 * so headings, colors, and all custom styles apply identically.
 */
function BlockNoteReadOnly({ content }: { content: string }) {
  const theme = useDocumentThemeMode()
  const { cssVars } = useEditorTheme()
  const editor = useCreateBlockNote({
    schema,
    _tiptapOptions: { injectNonce: getRuntimeStyleNonce() },
    extensions: [createArrowLigaturesExtension(), createMathInputExtension()],
  })
  const [prevContent, setPrevContent] = useState(content)
  const [ready, setReady] = useState(false)

  if (content !== prevContent) {
    setPrevContent(content)
    setReady(false)
  }

  useEffect(() => {
    let cancelled = false

    // Strip frontmatter before parsing
    const body = content.replace(/^---[\s\S]*?---\n?/m, '').trim()

    const parseAndSetBlocks = async () => {
      try {
        const blocks = await Promise.resolve(editor.tryParseMarkdownToBlocks(body))

        if (cancelled) return

        const safeBlocks = blocks && blocks.length > 0
          ? blocks
          : [{ type: 'paragraph' as const, content: [] }]

        editor.replaceBlocks(editor.document, safeBlocks)
        if (!cancelled) setReady(true)
      } catch (err) {
        console.error('[Flashcard] Failed to parse markdown or replace blocks in BlockNoteReadOnly:', err)
        if (!cancelled) setReady(true)
      }
    }

    parseAndSetBlocks()

    return () => {
      cancelled = true
    }
  }, [content, editor])

  if (!ready) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
        <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
        Loading…
      </div>
    )
  }

  const view = (
    <ComponentsContext.Provider value={components}>
      <BlockNoteViewRaw
        editor={editor}
        editable={false}
        className="bn-mantine"
        data-mantine-color-scheme={theme === 'dark' ? 'dark' : 'light'}
        theme={theme}
      />
    </ComponentsContext.Provider>
  )

  return (
    // cssVars injects all theme CSS custom properties (--colors-text, --headings-h1-color, etc.)
    // exactly like SingleEditorView does, so EditorTheme.css selectors get the correct values.
    <div
      className="editor__blocknote-container [&_.bn-editor]:px-0 [&_.bn-editor]:py-0 [&_.bn-block-outer:first-child_.bn-block-content]:pt-0"
      style={cssVars as React.CSSProperties}
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-violet-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{current}/{total}</span>
    </div>
  )
}

function SessionComplete({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/10">
        <Confetti size={36} weight="duotone" className="text-violet-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2">Session complete!</h2>
        <p className="text-sm text-muted-foreground">All cards reviewed. Great work!</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="px-6 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
      >
        Done
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const FlashcardStudyView = memo(function FlashcardStudyView({
  entries,
  onRate,
  onClose,
  deckName,
}: FlashcardStudyViewProps) {
  const [queueIndex, setQueueIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [isRating, setIsRating] = useState(false)
  // Full markdown content loaded on-demand per card
  const [cardContent, setCardContent] = useState<string | null>(null)
  // Left padding read from the breadcrumb-bar element so the portal header
  // clears the macOS traffic-light buttons even though the portal is at body.
  const [headerLeftPad, setHeaderLeftPad] = useState('80px')
  const containerRef = useRef<HTMLDivElement>(null)

  // Read the CSS variable value from the actual DOM element that has it set
  useEffect(() => {
    const breadcrumbEl = document.querySelector('.breadcrumb-bar')
    if (breadcrumbEl instanceof HTMLElement) {
      const val = getComputedStyle(breadcrumbEl)
        .getPropertyValue('--breadcrumb-bar-left-padding')
        .trim()
      if (val) setHeaderLeftPad(val)
    }
  }, [])

  const isComplete = queueIndex >= entries.length
  const entry = !isComplete ? entries[queueIndex] : null
  const card = entry ? getFSRSCard(entry) : null

  // Load full note content from vault whenever the card changes
  useEffect(() => {
    if (!entry) { setCardContent(null); return }
    setCardContent(null)

    const cached = getCachedNoteContentEntry(entry.path)
    if (cached?.value) { setCardContent(cached.value); return }

    invoke<string>('get_note_content', { path: entry.path })
      .then((c) => setCardContent(c))
      .catch(() => setCardContent(entry.snippet || ''))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.path])

  // Split the loaded content into front / back faces
  const { front, back, hasBack } = useMemo(() => {
    if (!entry) return { front: '', back: '', hasBack: false }
    return splitFlashcardContent(cardContent ?? entry.snippet ?? '')
  }, [cardContent, entry])

  // Next-interval previews for the rating buttons
  const intervals = useMemo(() => (card ? fsrsPreviewIntervals(card) : null), [card])

  // Keep focus on the container for keyboard shortcuts
  useEffect(() => { containerRef.current?.focus() }, [queueIndex])

  const handleFlip = useCallback(() => setFlipped(true), [])

  const handleRate = useCallback(async (rating: FSRSRating) => {
    if (!entry || isRating) return
    setIsRating(true)
    onRate(entry, rating)
    setTimeout(() => {
      setQueueIndex((i) => i + 1)
      setFlipped(false)
      setIsRating(false)
    }, 150)
  }, [entry, isRating, onRate])

  // Keyboard shortcuts: Space/Enter = flip; 1-4 = rate after flip; Esc = close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isComplete) { if (e.key === 'Escape') onClose(); return }
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault()
          if (!flipped) handleFlip()
          break
        case 'Escape': onClose(); break
        case '1': if (flipped) handleRate(1); break
        case '2': if (flipped) handleRate(2); break
        case '3': if (flipped) handleRate(3); break
        case '4': if (flipped) handleRate(4); break
        default: break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flipped, isComplete, handleFlip, handleRate, onClose])

  const formatInterval = (days: number) => {
    if (days === 0) return '<1d'
    if (days < 7) return `${days}d`
    if (days < 30) return `${Math.round(days / 7)}w`
    return `${Math.round(days / 30)}mo`
  }

  const overlay = (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-label="Flashcard study session"
    >
      {/* Header — left pad is read at runtime from the breadcrumb-bar element
          so it correctly clears macOS traffic lights even inside a portal */}
      <div
        className="flex items-center gap-3 border-b border-border shrink-0"
        style={{ padding: `10px 16px 10px ${headerLeftPad}`, minHeight: 52 }}
      >
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="End session"
        >
          <X size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <ProgressBar current={queueIndex} total={entries.length} />
          {deckName && (
            <p className="mt-0.5 text-[10px] text-muted-foreground truncate flex items-center gap-1">
              <Books size={10} />
              {deckName}
            </p>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {entries.length - queueIndex} remaining
        </span>
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        tabIndex={-1}
        className="flex flex-col flex-1 min-h-0 gap-4 p-6 overflow-hidden focus:outline-none max-w-3xl mx-auto w-full"
      >
        {isComplete
          ? <SessionComplete onClose={onClose} />
          : (
              <>
                {/* Type + state badge */}
                {entry?.isA && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      {entry.isA}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {card?.state === 'new'
                        ? (<><Sparkle size={12} weight="fill" className="text-emerald-500" /> New</>)
                        : card?.state === 'learning'
                          ? (<><Books size={12} weight="fill" className="text-blue-500" /> Learning</>)
                          : (<><CalendarBlank size={12} weight="fill" className="text-violet-500" /> {card?.reps ?? 0} reviews</>)}
                    </span>
                  </div>
                )}

                {/* Front face — BlockNote read-only, full content, scrollable */}
                <div
                  className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-card px-6 py-4"
                  aria-label="Front face"
                >
                  {cardContent === null
                    ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                          Loading…
                        </div>
                      )
                    : <BlockNoteReadOnly content={front} />}
                </div>

                {/* Flip area */}
                {!flipped
                  ? (
                      <div className="flex flex-col items-center gap-2 shrink-0 py-2">
                        <button
                          type="button"
                          onClick={handleFlip}
                          className={cn(
                            'px-8 py-3 rounded-xl text-sm font-medium transition-all duration-150',
                            'bg-violet-600 text-white hover:bg-violet-700 shadow-sm hover:shadow-md',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                          )}
                          data-testid="flashcard-show-answer"
                        >
                          Show answer
                          <span className="ml-2 text-violet-200 text-xs">[Space]</span>
                        </button>
                        <p className="text-[10px] text-muted-foreground">
                          Rate after revealing — 1 Again · 2 Hard · 3 Good · 4 Easy
                        </p>
                      </div>
                    )
                  : (
                      <div className="flex flex-col shrink-0 gap-3 animate-in fade-in duration-200">
                        {/* Back face (only when note has <!-- FLASHCARD:BACK --> marker) */}
                        {hasBack && (
                          <div
                            className="max-h-48 overflow-y-auto rounded-xl bg-card/60 px-6 py-4"
                            aria-label="Back face"
                          >
                            <BlockNoteReadOnly content={back} />
                          </div>
                        )}

                        {/* Rating buttons */}
                        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Rate your recall">
                          {([1, 2, 3, 4] as FSRSRating[]).map((r) => {
                            const cfg = RATING_CONFIG[r]
                            const interval = intervals ? formatInterval(intervals[r]) : '…'
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => handleRate(r)}
                                disabled={isRating}
                                className={cn(
                                  'flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-sm font-medium',
                                  'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  cfg.color,
                                )}
                                data-testid={`flashcard-rate-${r}`}
                                aria-label={`${cfg.label} — ${interval}`}
                              >
                                <span className="text-lg leading-none">{cfg.emoji}</span>
                                <span className="font-semibold">{cfg.label}</span>
                                <span className="text-xs opacity-70">{interval}</span>
                                <span className="text-[10px] opacity-50">[{cfg.key}]</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
              </>
            )}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
})
