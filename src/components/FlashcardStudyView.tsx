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

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { invoke } from '@tauri-apps/api/core'
import { Books, CalendarBlank, Confetti, SpeakerHigh, Sparkle, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
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
import { resolveFlashcardAudioUrl } from '../utils/flashcardAudio'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FlashcardStudyViewProps {
  /** Ordered queue of entries to study */
  entries: VaultEntry[]
  /** Called when user rates the current card */
  onRate: (entry: VaultEntry, rating: FSRSRating, durationMs?: number) => void
  /** Called when session ends (X button, Escape, or queue exhausted) */
  onClose: () => void
  /** Optional deck name to display in the session header */
  deckName?: string
}

type RatingLabel = { label: string; color: string; key: string; xp: number }

const RATING_CONFIG: Record<FSRSRating, RatingLabel> = {
  1: { label: 'Again', color: 'bg-[var(--accent-red-light)] text-[var(--accent-red)] border-[var(--accent-red)]/30 hover:bg-[var(--accent-red)]/20', key: '1', xp: 0 },
  2: { label: 'Hard', color: 'bg-[var(--accent-orange-light)] text-[var(--accent-orange)] border-[var(--accent-orange)]/30 hover:bg-[var(--accent-orange)]/20', key: '2', xp: 3 },
  3: { label: 'Good', color: 'bg-[var(--accent-green-light)] text-[var(--accent-green)] border-[var(--accent-green)]/30 hover:bg-[var(--accent-green)]/20', key: '3', xp: 5 },
  4: { label: 'Easy', color: 'bg-[var(--accent-blue-light)] text-[var(--accent-blue)] border-[var(--accent-blue)]/30 hover:bg-[var(--accent-blue)]/20', key: '4', xp: 7 },
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
          className="h-full rounded-full bg-[var(--accent-blue)] transition-all duration-300"
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
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent-blue-light)]">
        <Confetti size={36} weight="duotone" className="text-[var(--accent-blue)]" />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2">Session complete!</h2>
        <p className="text-sm text-muted-foreground">All cards reviewed. Great work!</p>
      </div>
      <Button
        type="button"
        onClick={onClose}
        className="px-6 py-2 rounded-lg bg-[var(--accent-blue)] text-white text-sm font-medium hover:opacity-90 transition-colors h-auto"
      >
        Done
      </Button>
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
  const cardStartTimeRef = useRef(Date.now())
  const [xpFloats, setXpFloats] = useState<{ id: number; x: number; y: number; xp: number }[]>([])
  const xpFloatIdRef = useRef(0)

  useEffect(() => {
    cardStartTimeRef.current = Date.now()
  }, [queueIndex])

  // Full markdown content loaded on-demand per card
  const [cardContent, setCardContent] = useState<string | null>(null)
  // Left padding: on macOS with titlebar overlay (body.mac-chrome) always
  // use 80px so the close button never overlaps the traffic-light buttons,
  // regardless of whether the sidebar/note-list is open.
  const [headerLeftPad] = useState(() =>
    document.body.classList.contains('mac-chrome') ? '80px' : '16px'
  )

  const containerRef = useRef<HTMLDivElement>(null)

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

  // IPA and language from entry user-defined properties (not FSRS fields)
  const ipa = entry?.properties?.['IPA'] != null ? String(entry.properties['IPA']) : null
  const language = entry?.properties?.['language'] != null ? String(entry.properties['language']) : null

  // Vault path for resolving attachment asset:// URLs
  const vaultPath = entry?.workspace?.path ?? null

  // Resolve best playable audio URL (property > wikilink > full URL)
  const audioUrl = useMemo(
    () => resolveFlashcardAudioUrl({
      properties: entry?.properties ?? {},
      backMarkdown: back,
      vaultPath,
    }),
    [entry?.properties, back, vaultPath],
  )

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePlayAudio = useCallback(() => {
    if (!audioUrl) return
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    const audio = audioRef.current
    if (!audio.paused) {
      audio.pause()
      audio.currentTime = 0
    }
    audio.src = audioUrl
    audio.play().catch(() => { /* ignore: user may have blocked autoplay */ })
  }, [audioUrl])

  // Next-interval previews for the rating buttons
  const intervals = useMemo(() => (card ? fsrsPreviewIntervals(card) : null), [card])

  // Keep focus on the container for keyboard shortcuts
  useEffect(() => { containerRef.current?.focus() }, [queueIndex])

  const handleFlip = useCallback(() => setFlipped(true), [])

  const handleRate = useCallback(async (rating: FSRSRating, event?: React.MouseEvent) => {
    if (!entry || isRating) return
    setIsRating(true)
    const duration = Date.now() - cardStartTimeRef.current
    onRate(entry, rating, duration)

    // XP float animation
    const xp = RATING_CONFIG[rating].xp
    if (xp > 0 && event) {
      const id = xpFloatIdRef.current++
      const { clientX, clientY } = event
      setXpFloats((prev) => [...prev, { id, x: clientX, y: clientY, xp }])
      setTimeout(() => setXpFloats((prev) => prev.filter((f) => f.id !== id)), 900)
    }

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
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm overflow-hidden"
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
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 h-auto w-auto"
          aria-label="End session"
        >
          <X size={18} />
        </Button>
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

      {/* Scrollable Content Area */}
      <div
        ref={containerRef}
        tabIndex={-1}
        className="flex-1 min-h-0 overflow-y-auto p-6 focus:outline-none"
      >
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-4 pb-12">
          {isComplete ? (
            <SessionComplete onClose={onClose} />
          ) : (
            <>
              {/* Type + state badge */}
              {entry?.isA && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    {entry.isA}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {card?.state === 'new' ? (
                      <>
                        <Sparkle size={12} weight="fill" className="text-[var(--accent-green)]" /> New
                      </>
                    ) : card?.state === 'learning' ? (
                      <>
                        <Books size={12} weight="fill" className="text-[var(--accent-blue)]" /> Learning
                      </>
                    ) : (
                      <>
                        <CalendarBlank size={12} weight="fill" className="text-[var(--accent-blue)]" />{' '}
                        {card?.reps ?? 0} reviews
                      </>
                    )}
                  </span>
                </div>
              )}

              {/* Language badge above front */}
              {language && !ipa && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-blue-light)] text-[var(--accent-blue)] font-medium">
                    {language}
                  </span>
                </div>
              )}

              {/* Unified Card Container */}
              <div className="rounded-2xl border border-border bg-card shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                {/* Front face */}
                <div className="px-8 py-6" aria-label="Front face">
                  {cardContent === null ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                      Loading…
                    </div>
                  ) : (
                    <BlockNoteReadOnly content={front} />
                  )}
                </div>

                {/* Divider when flipped */}
                {flipped && hasBack && (
                  <div className="relative shrink-0 py-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-dashed border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground font-semibold tracking-wider text-[10px]">
                        Đáp án / Answer
                      </span>
                    </div>
                  </div>
                )}

                {/* Back face */}
                {flipped && hasBack && (
                  <div className="px-8 py-6 bg-muted/20 border-t border-border/30 animate-in fade-in slide-in-from-bottom-2 duration-300" aria-label="Back face">
                    <BlockNoteReadOnly content={back} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sticky Footer */}
      {!isComplete && (
        <div className="border-t border-border bg-background/80 backdrop-blur-md px-6 py-4 shrink-0">
          <div className="max-w-3xl mx-auto w-full">
            {!flipped ? (
              <div className="flex flex-col items-center gap-2 py-1">
                <Button
                  type="button"
                  onClick={handleFlip}
                  className={cn(
                    'px-10 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 h-auto',
                    'bg-[var(--accent-blue)] text-white hover:opacity-90 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]',
                  )}
                  data-testid="flashcard-show-answer"
                >
                  Show answer
                  <span className="ml-2 text-[var(--accent-blue-light)] text-xs font-normal">[Space]</span>
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  Rate after revealing — 1 Again · 2 Hard · 3 Good · 4 Easy
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                {/* IPA + language + audio row */}
                {(ipa ?? audioUrl) && (
                  <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
                    {ipa && (
                      <span
                        className="font-mono text-sm px-2.5 py-0.5 rounded-lg bg-[var(--accent-blue-light)] text-[var(--accent-blue)] select-all"
                        title="IPA pronunciation"
                      >
                        {ipa}
                      </span>
                    )}
                    {language && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {language}
                      </span>
                    )}
                    {audioUrl && (
                      <Button
                        type="button"
                        onClick={handlePlayAudio}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg h-auto text-xs font-semibold bg-[var(--accent-green-light)] text-[var(--accent-green)] hover:bg-[var(--accent-green)]/20 transition-colors"
                        aria-label="Play pronunciation audio"
                        title="Play pronunciation"
                      >
                        <SpeakerHigh size={14} weight="fill" />
                        Play
                      </Button>
                    )}
                  </div>
                )}

                {/* Rating buttons */}
                <div className="grid grid-cols-4 gap-3" role="group" aria-label="Rate your recall">
                  {([1, 2, 3, 4] as FSRSRating[]).map((r) => {
                    const cfg = RATING_CONFIG[r]
                    const interval = intervals ? formatInterval(intervals[r]) : '…'
                    return (
                      <Button
                        key={r}
                        type="button"
                        onClick={(e) => handleRate(r, e)}
                        disabled={isRating}
                        className={cn(
                          'flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-xs font-medium h-auto',
                          'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          'hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md',
                          cfg.color,
                        )}
                        data-testid={`flashcard-rate-${r}`}
                        aria-label={`${cfg.label} — ${interval}`}
                      >
                        <span className="font-bold">{cfg.label}</span>
                        <span className="text-[10px] opacity-70">{interval}</span>
                        <span className="text-[9px] opacity-40">[{cfg.key}]</span>
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {createPortal(overlay, document.body)}
      {/* XP float animations — rendered at the click position */}
      {xpFloats.map((f) =>
        createPortal(
          <div
            key={f.id}
            className="xp-float pointer-events-none fixed z-[9999] text-sm font-black text-[var(--accent-blue)] select-none"
            style={{ left: f.x, top: f.y - 20 }}
          >
            +{f.xp} XP ✨
          </div>,
          document.body,
        )
      )}
    </>
  )
})
