import { Brain, Clock, Pause, PencilSimpleLine, Swap, WarningCircle } from '@phosphor-icons/react'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import type { NoteLearningState } from '../../lib/learning/types'
import './noteMemory.css'

function status(state: NoteLearningState, due: string | null | undefined, clock: number) {
  if (state === 'disabled') return { label: 'learning.noteMemory.paused', tone: 'neutral', Icon: Pause } as const
  if (state === 'draft') return { label: 'learning.draft', tone: 'warning', Icon: PencilSimpleLine } as const
  if (state === 'conversionRequired' || state === 'retained') return { label: 'learning.noteMemory.title', tone: 'warning', Icon: Swap } as const
  if (state === 'pending') return { label: 'learning.noteMemory.pendingOperations', tone: 'warning', Icon: WarningCircle } as const
  if (state === 'invalid' || state === 'deleted') return { label: 'learning.noteMemory.pendingOperations', tone: 'error', Icon: WarningCircle } as const
  if (due && Number.isFinite(Date.parse(due))) return Date.parse(due) <= clock
    ? { label: 'decks.filter.due', tone: 'due', Icon: Brain } as const
    : { label: 'learning.noteMemory.scheduled', tone: 'neutral', Icon: Clock } as const
  return { label: 'learning.active', tone: 'due', Icon: Brain } as const
}

/** A view of existing learning state; badges never infer mastery or mutate schedules. */
export function NoteMemoryStatus({ state, due, clock = 0, locale }: {
  state: NoteLearningState; due?: string | null; clock?: number; locale: AppLocale
}) {
  if (state === 'ordinary') return null
  const { label, tone, Icon } = status(state, due, clock)
  return <span className="note-memory-status" data-tone={tone}>
    <Icon aria-hidden="true" />{translate(locale, label satisfies TranslationKey)}
  </span>
}
