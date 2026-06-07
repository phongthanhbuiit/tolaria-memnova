/**
 * FlashcardPanel.tsx
 *
 * Shows a "Flashcard" section in the Properties / Inspector panel.
 * Allows the user to toggle FSRS spaced-repetition on/off for the current note
 * and displays current scheduling state when enabled.
 */

import { useCallback } from 'react'
import { Cards, CalendarBlank, Sparkle } from '@phosphor-icons/react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { VaultEntry } from '../../types'
import type { AppLocale } from '../../lib/i18n'

interface FlashcardPanelProps {
  entry: VaultEntry
  onUpdateFrontmatter?: (path: string, key: string, value: boolean) => Promise<void>
  locale?: AppLocale
}

function formatDueDate(due: string | undefined): string {
  if (!due) return '—'
  const date = new Date(due)
  if (isNaN(date.getTime())) return '—'
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / 86_400_000)
  if (diffDays < 0) return 'Due now'
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays < 7) return `In ${diffDays} days`
  if (diffDays < 30) return `In ${Math.round(diffDays / 7)} weeks`
  return `In ${Math.round(diffDays / 30)} months`
}

function StateChip({ state }: { state: string | undefined }) {
  if (!state || state === 'new') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-green-light)] text-[var(--accent-green)]">
        <Sparkle size={9} weight="fill" />
        New
      </span>
    )
  }
  if (state === 'learning' || state === 'relearning') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-blue-light)] text-[var(--accent-blue)]">
        <Cards size={9} weight="duotone" />
        Learning
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-purple-light)] text-[var(--accent-purple)]">
      <CalendarBlank size={9} weight="fill" />
      Review
    </span>
  )
}

export function FlashcardPanel({ entry, onUpdateFrontmatter }: FlashcardPanelProps) {
  const isEnabled = entry.fsrsEnabled === true

  const handleToggle = useCallback(
    async (checked: boolean) => {
      if (!onUpdateFrontmatter) return
      await onUpdateFrontmatter(entry.path, '_fsrs_enabled', checked)
    },
    [entry.path, onUpdateFrontmatter],
  )

  return (
    <div>
      <h4 className="font-mono-overline mb-2 flex items-center gap-1 text-muted-foreground">
        <Cards size={12} weight="duotone" className="shrink-0" />
        Flashcard
      </h4>

      {/* Toggle row */}
      <div className="flex items-center justify-between px-1.5 py-1">
        <span className="text-[12px] text-muted-foreground">Spaced repetition</span>
        <Switch
          id={`fsrs-toggle-${entry.path}`}
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={!onUpdateFrontmatter}
          aria-label="Enable FSRS spaced repetition for this note"
        />
      </div>

      {/* Scheduling info — only when enabled */}
      {isEnabled && (
        <div
          className={cn(
            'mt-2 flex flex-col gap-1 rounded-lg px-2 py-1.5',
            'bg-muted/50 border border-border',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Next review</span>
            <span className="text-[11px] font-medium">{formatDueDate(entry.fsrsDue)}</span>
          </div>
          {entry.fsrsState && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">State</span>
              <StateChip state={entry.fsrsState} />
            </div>
          )}
          {entry.fsrsReps != null && entry.fsrsReps > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Reviews</span>
              <span className="text-[11px] font-medium tabular-nums">{entry.fsrsReps}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
