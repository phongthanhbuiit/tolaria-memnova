/**
 * FlashcardPanel.tsx
 *
 * Shows a "Flashcard" section in the Properties / Inspector panel.
 * Allows the user to:
 *  - Toggle FSRS spaced-repetition on/off for the current note
 *  - Set IPA phonetics (writes the `IPA` frontmatter property directly)
 *  - Set audio filename (writes the `audio` frontmatter property)
 *  - View current FSRS scheduling state
 */

import { useCallback, useEffect, useState } from 'react'
import { Cards, CalendarBlank, FolderOpen, MusicNote, PlusCircle, Sparkle, TextAa } from '@phosphor-icons/react'
import { invoke } from '@tauri-apps/api/core'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isTauri } from '../../mock-tauri'
import { FLASHCARD_BACK_MARKER } from '../../utils/flashcardMarkdown'
import type { VaultEntry, VaultPropertyValue } from '../../types'

// ---------------------------------------------------------------------------
// Prop types
// ---------------------------------------------------------------------------

type FrontmatterValue = string | number | boolean | string[] | null

interface FlashcardPanelProps {
  entry: VaultEntry
  /** Active vault path — passed from Inspector so browse works even when
   *  entry.workspace is undefined (notes in the default vault). */
  vaultPath?: string
  onUpdateFrontmatter?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
  /** Raw markdown content of the note — used to detect whether a back face already exists. */
  noteContent?: string | null
  /** Called when the user wants to add a back face marker to the note. */
  onAppendBackFace?: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Inline editable field — commits on blur / Enter, reverts on Escape
// ---------------------------------------------------------------------------

function VocabField({
  id,
  label,
  icon: Icon,
  value,
  placeholder,
  mono,
  onCommit,
  onBrowse,
}: {
  id: string
  label: string
  icon: React.ElementType
  value: string
  placeholder: string
  mono?: boolean
  onCommit: (v: string) => void
  onBrowse?: () => void
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const handleBlur = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed !== value) onCommit(trimmed)
  }, [draft, value, onCommit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') e.currentTarget.blur()
      if (e.key === 'Escape') {
        setDraft(value)
        e.currentTarget.blur()
      }
    },
    [value],
  )

  return (
    <div className="flex flex-col gap-0.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"
      >
        <Icon size={9} />
        {label}
      </label>
      <div className="flex gap-1">
        <Input
          id={id}
          className={cn(
            'h-[26px] flex-1 rounded border-border bg-muted px-1.5 text-[12px] text-foreground',
            'focus-visible:border-primary focus-visible:ring-0',
            mono && 'font-mono',
          )}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {onBrowse && (
          <Button
            size="icon-xs"
            variant="outline"
            onClick={onBrowse}
            title="Browse audio file"
            className="h-[26px] w-[26px] shrink-0 border-border bg-muted"
          >
            <FolderOpen size={12} />
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function readStringProp(props: Record<string, VaultPropertyValue> | undefined, key: string): string {
  const v = props?.[key]
  return typeof v === 'string' ? v : ''
}

/** Card type stored in frontmatter as `card_type: vocabulary` */
type CardType = 'basic' | 'vocabulary'

function resolveCardType(props: Record<string, VaultPropertyValue> | undefined): CardType {
  return readStringProp(props, 'card_type') === 'vocabulary' ? 'vocabulary' : 'basic'
}

export function FlashcardPanel({ entry, vaultPath, onUpdateFrontmatter, noteContent, onAppendBackFace }: FlashcardPanelProps) {
  const isEnabled = entry.fsrsEnabled === true
  const cardType = resolveCardType(entry.properties)
  const isVocabulary = cardType === 'vocabulary'
  const ipaValue = readStringProp(entry.properties, 'IPA')
  const audioValue = readStringProp(entry.properties, 'audio')
  const hasBackFace = noteContent != null && noteContent.includes(FLASHCARD_BACK_MARKER)
  const [isAppending, setIsAppending] = useState(false)

  const handleAddBackFace = useCallback(async () => {
    if (!onAppendBackFace || isAppending) return
    setIsAppending(true)
    try {
      await onAppendBackFace()
    } finally {
      setIsAppending(false)
    }
  }, [onAppendBackFace, isAppending])

  const handleToggle = useCallback(
    async (checked: boolean) => {
      if (!onUpdateFrontmatter) return
      await onUpdateFrontmatter(entry.path, '_fsrs_enabled', checked)
    },
    [entry.path, onUpdateFrontmatter],
  )

  const handleCardTypeChange = useCallback(
    async (value: string) => {
      if (!onUpdateFrontmatter) return
      // Store as regular frontmatter property — 'basic' removes the key
      if (value === 'vocabulary') {
        await onUpdateFrontmatter(entry.path, 'card_type', 'vocabulary')
      } else {
        await onUpdateFrontmatter(entry.path, 'card_type', '')
      }
    },
    [entry.path, onUpdateFrontmatter],
  )

  const handleIpaCommit = useCallback(
    async (value: string) => {
      if (!onUpdateFrontmatter) return
      await onUpdateFrontmatter(entry.path, 'IPA', value)
    },
    [entry.path, onUpdateFrontmatter],
  )

  const handleAudioCommit = useCallback(
    async (value: string) => {
      if (!onUpdateFrontmatter) return
      await onUpdateFrontmatter(entry.path, 'audio', value)
    },
    [entry.path, onUpdateFrontmatter],
  )

  /** Open native file picker for audio files, copy to vault, commit filename. */
  const handleBrowseAudio = useCallback(async () => {
    if (!onUpdateFrontmatter) return
    if (!isTauri()) return

    // Prefer the explicit vaultPath prop; fall back to workspace identity path.
    const resolvedVaultPath = vaultPath ?? entry.workspace?.path
    if (!resolvedVaultPath) return

    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      multiple: false,
      title: 'Select audio file',
      filters: [{
        name: 'Audio',
        extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'webm'],
      }],
    })

    if (!selected || typeof selected !== 'string') return

    const filename = await invoke<string>('copy_audio_to_vault', {
      vaultPath: resolvedVaultPath,
      sourcePath: selected,
    })

    await onUpdateFrontmatter(entry.path, 'audio', filename)
  }, [entry.path, entry.workspace, vaultPath, onUpdateFrontmatter])

  return (
    <div>
      <h4 className="font-mono-overline mb-2 flex items-center gap-1 text-muted-foreground">
        <Cards size={12} weight="duotone" className="shrink-0" />
        Flashcard
      </h4>

      {/* Spaced repetition toggle */}
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

      {/* Card type selector — only visible when FSRS is on */}
      {isEnabled && (
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="text-[12px] text-muted-foreground">Card type</span>
          <Select
            value={cardType}
            onValueChange={handleCardTypeChange}
            disabled={!onUpdateFrontmatter}
          >
            <SelectTrigger
              id={`fsrs-card-type-${entry.path}`}
              className="h-[22px] w-[100px] border-border bg-muted px-1.5 py-0 text-[11px] shadow-none"
              style={{ borderRadius: 4 }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="vocabulary">Vocabulary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Vocabulary-only fields: IPA + audio */}
      {isEnabled && isVocabulary && (
        <div className="mt-2 flex flex-col gap-2 px-1.5">
          <VocabField
            id={`fsrs-ipa-${entry.path}`}
            label="IPA phonetics"
            icon={TextAa}
            value={ipaValue}
            placeholder="/ˈvɒkəb.jʊ.lər.i/"
            mono
            onCommit={handleIpaCommit}
          />
          <VocabField
            id={`fsrs-audio-${entry.path}`}
            label="Audio file"
            icon={MusicNote}
            value={audioValue}
            placeholder="mp3 · wav · ogg · m4a · flac …"
            onCommit={handleAudioCommit}
            onBrowse={isTauri() ? handleBrowseAudio : undefined}
          />
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            Drag an audio file into the editor — Tolaria copies it to{' '}
            <span className="font-mono">attachments/</span>. Then type the filename above.
          </p>
        </div>
      )}

      {/* Add back face button — only shown when FSRS is on and the note has no back marker yet */}
      {isEnabled && !hasBackFace && onAppendBackFace && (
        <div className="mt-2 px-1.5">
          <Button
            type="button"
            variant="outline"
            disabled={isAppending}
            onClick={handleAddBackFace}
            className={cn(
              'w-full h-[28px] gap-1.5 text-[11px] font-medium border-dashed',
              'border-[var(--accent-blue)]/40 text-[var(--accent-blue)] hover:bg-[var(--accent-blue-light)] hover:border-[var(--accent-blue)]',
              'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
            )}
            aria-label="Add back face to this flashcard"
            data-testid="flashcard-add-back-face"
          >
            <PlusCircle size={12} weight="bold" />
            {isAppending ? 'Adding…' : 'Add Back Face'}
          </Button>
          <p className="mt-1 text-[10px] text-muted-foreground/60 leading-relaxed px-0.5">
            Adds a divider — type the answer below it in the editor.
          </p>
        </div>
      )}

      {/* FSRS scheduling stats */}
      {isEnabled && (
        <div
          className={cn(
            'mt-3 flex flex-col gap-1 rounded-lg px-2 py-1.5',
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
