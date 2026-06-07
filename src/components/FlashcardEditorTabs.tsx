/**
 * FlashcardEditorTabs.tsx
 *
 * A tab switcher rendered above the editor when a note has FSRS enabled.
 * Shows [Front] [Back] tabs using Phosphor icons. When active tab switches,
 * the parent manages which portion of the note content is rendered in the editor.
 *
 * Design:
 *  - Tabs are purely a VIEW concern — they don't split or mutate content.
 *  - The parent (EditorContentLayout) reads the active tab and passes the
 *    appropriate content slice to the BlockNote editor.
 *  - This component is a pure presentational element.
 */

import { type ReactNode, memo } from 'react'
import { BookOpen, Cards, PencilSimpleLine, Plus } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export type FlashcardFace = 'front' | 'back'

interface FlashcardEditorTabsProps {
  activeFace: FlashcardFace
  hasBack: boolean
  onChangeFace: (face: FlashcardFace) => void
  /** If true, the note is FSRS-enabled but no back face has been added yet */
  onAddBack?: () => void
  className?: string
}

interface TabProps {
  label: string
  icon: ReactNode
  isActive: boolean
  onClick: () => void
  testId?: string
}

function Tab({ label, icon, isActive, onClick, testId }: TabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-testid={testId}
      onClick={onClick}
      className={cn(
        'flashcard-tab',
        'relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium',
        'rounded-md transition-all duration-150 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
      )}
    >
      <span aria-hidden="true" className="flex items-center">{icon}</span>
      <span>{label}</span>
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-px h-px bg-background"
        />
      )}
    </button>
  )
}

function AddBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="flashcard-add-back"
      className={cn(
        'ml-1 flex items-center gap-1 px-2 py-1 text-xs',
        'rounded-md text-muted-foreground border border-dashed border-border',
        'hover:text-foreground hover:border-foreground/30 transition-colors duration-150',
      )}
    >
      <Plus size={11} aria-hidden="true" />
      <span>Add back</span>
    </button>
  )
}

export const FlashcardEditorTabs = memo(function FlashcardEditorTabs({
  activeFace,
  hasBack,
  onChangeFace,
  onAddBack,
  className,
}: FlashcardEditorTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Flashcard faces"
      data-testid="flashcard-editor-tabs"
      className={cn(
        'flashcard-editor-tabs',
        'flex items-center gap-1 px-3 py-1',
        'border-b border-border bg-muted/40',
        className,
      )}
    >
      <Tab
        label="Front"
        icon={<BookOpen size={13} weight="bold" />}
        isActive={activeFace === 'front'}
        onClick={() => onChangeFace('front')}
        testId="flashcard-tab-front"
      />
      {hasBack
        ? (
            <Tab
              label="Back"
              icon={<PencilSimpleLine size={13} weight="bold" />}
              isActive={activeFace === 'back'}
              onClick={() => onChangeFace('back')}
              testId="flashcard-tab-back"
            />
          )
        : onAddBack
          ? <AddBackButton onClick={onAddBack} />
          : null}

      {/* Separator + pill badge on the right */}
      <div className="ml-auto flex items-center gap-2">
        <span
          aria-label="Flashcard — FSRS enabled"
          title="FSRS spaced repetition active"
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
            'text-[10px] font-medium tracking-wide',
            'bg-violet-500/10 text-violet-500 border border-violet-500/20',
          )}
        >
          <Cards size={11} weight="duotone" aria-hidden="true" />
          FSRS
        </span>
      </div>
    </div>
  )
})

