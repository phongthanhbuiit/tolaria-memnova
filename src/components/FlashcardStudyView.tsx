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
import { X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { splitFlashcardContent } from '../utils/flashcardMarkdown'
import { getFSRSCard } from '../lib/fsrsVaultEntry'
import { fsrsPreviewIntervals } from '../lib/fsrs'
import type { FSRSRating } from '../lib/fsrs'
import type { VaultEntry } from '../types'

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
}

type RatingLabel = { label: string; emoji: string; color: string; key: string }

const RATING_CONFIG: Record<FSRSRating, RatingLabel> = {
  1: { label: 'Again', emoji: '😰', color: 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20', key: '1' },
  2: { label: 'Hard', emoji: '😓', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30 hover:bg-orange-500/20', key: '2' },
  3: { label: 'Good', emoji: '😊', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20', key: '3' },
  4: { label: 'Easy', emoji: '😄', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500/20', key: '4' },
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CardFace({
  children,
  label,
  className,
}: {
  children: React.ReactNode
  label: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative flex-1 min-h-0 overflow-auto rounded-xl border border-border bg-card p-6',
        className,
      )}
      aria-label={label}
    >
      {children}
    </div>
  )
}

function MarkdownPreview({ content }: { content: string }) {
  // Minimal safe text rendering — strips frontmatter and shows plain text
  const text = useMemo(() => {
    const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/m, '')
    return withoutFrontmatter.trim()
  }, [content])

  // Simple paragraph-based rendering. In future, wire to BlockNote read-only.
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
      {text.split('\n\n').map((para, i) => {
        if (para.startsWith('#')) {
          const level = para.match(/^#+/)?.[0].length ?? 1
          const headingText = para.replace(/^#+\s*/, '')
          if (level === 1) return <h1 key={i} className="text-xl font-bold mb-3">{headingText}</h1>
          if (level === 2) return <h2 key={i} className="text-lg font-semibold mb-2">{headingText}</h2>
          return <h3 key={i} className="text-base font-medium mb-2">{headingText}</h3>
        }
        return <p key={i} className="mb-3 last:mb-0 text-sm leading-relaxed">{para}</p>
      })}
    </div>
  )
}

function ProgressBar({
  current,
  total,
}: {
  current: number
  total: number
}) {
  const pct = total > 0 ? Math.round(((current) / total) * 100) : 0
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
      <span className="text-xs tabular-nums text-muted-foreground">
        {current}/{total}
      </span>
    </div>
  )
}

function SessionComplete({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="text-6xl">🎉</div>
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
}: FlashcardStudyViewProps) {
  const [queueIndex, setQueueIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [isRating, setIsRating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isComplete = queueIndex >= entries.length
  const entry = !isComplete ? entries[queueIndex] : null
  const card = entry ? getFSRSCard(entry) : null

  // Split front/back
  const { front, back, hasBack } = useMemo(() => {
    if (!entry) return { front: '', back: '', hasBack: false }
    return splitFlashcardContent(entry.snippet || '')
  }, [entry])

  // Preview intervals for rating buttons
  const intervals = useMemo(() => {
    if (!card) return null
    return fsrsPreviewIntervals(card)
  }, [card])

  // Focus container for keyboard events
  useEffect(() => {
    containerRef.current?.focus()
  }, [queueIndex])

  const handleFlip = useCallback(() => {
    setFlipped(true)
  }, [])

  const handleRate = useCallback(async (rating: FSRSRating) => {
    if (!entry || isRating) return
    setIsRating(true)
    onRate(entry, rating)
    // Advance queue
    setTimeout(() => {
      setQueueIndex((i) => i + 1)
      setFlipped(false)
      setIsRating(false)
    }, 150)
  }, [entry, isRating, onRate])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isComplete) {
        if (e.key === 'Escape') onClose()
        return
      }
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault()
          if (!flipped) handleFlip()
          break
        case 'Escape':
          onClose()
          break
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
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="End session"
        >
          <X size={18} />
        </button>
        <div className="flex-1">
          <ProgressBar current={queueIndex} total={entries.length} />
        </div>
        <span className="text-xs text-muted-foreground">
          {entries.length - queueIndex} remaining
        </span>
      </div>

      {/* Content area */}
      <div
        ref={containerRef}
        tabIndex={-1}
        className="flex flex-col flex-1 min-h-0 gap-4 p-6 overflow-hidden focus:outline-none max-w-3xl mx-auto w-full"
      >
        {isComplete
          ? <SessionComplete onClose={onClose} />
          : (
              <>
                {/* Type badge */}
                {entry?.isA && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      {entry.isA}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {card?.state === 'new' ? '🆕 New' : card?.state === 'learning' ? '📘 Learning' : `📅 ${card?.reps ?? 0} reviews`}
                    </span>
                  </div>
                )}

                {/* Front card */}
                <CardFace label="Front face" className="shrink-0 max-h-[40%]">
                  <MarkdownPreview content={front} />
                </CardFace>

                {/* Flip / Back area */}
                {!flipped
                  ? (
                      <div className="flex flex-col items-center justify-center gap-3 flex-1">
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
                      </div>
                    )
                  : (
                      <div className="flex flex-col flex-1 min-h-0 gap-4 animate-in fade-in duration-200">
                        {/* Back card */}
                        <CardFace label="Back face" className="flex-1">
                          {hasBack
                            ? <MarkdownPreview content={back} />
                            : (
                                <p className="text-sm text-muted-foreground italic">
                                  No back face — rate based on your recall.
                                </p>
                              )}
                        </CardFace>

                        {/* Rating buttons */}
                        <div className="grid grid-cols-4 gap-2 shrink-0" role="group" aria-label="Rate your recall">
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
