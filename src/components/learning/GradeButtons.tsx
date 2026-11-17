import type { ComponentProps, MouseEvent } from 'react'
import type { FSRSRating } from '../../lib/fsrs'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import { Button } from '../ui/button'

const ratings = [1, 2, 3, 4] as const
const labels: Record<FSRSRating, TranslationKey> = {
  1: 'learning.again',
  2: 'learning.hard',
  3: 'learning.good',
  4: 'learning.easy',
}
const colors = [
  'border-[var(--accent-red)]',
  'border-[var(--accent-orange)]',
  'border-[var(--accent-green)]',
  'border-[var(--accent-blue)]',
]
type GradeAttributes = Pick<ComponentProps<typeof Button>, 'aria-label'> & { 'data-testid'?: string }

/** Presentation only: each owner keeps its readiness, scheduling and rating lock. */
export function GradeButtons({ locale, disabled, interval, onGrade, buttonProps, groupLabel }: {
  locale: AppLocale
  disabled: boolean
  interval: (rating: FSRSRating) => string
  onGrade: (rating: FSRSRating, event: MouseEvent<HTMLButtonElement>) => void
  buttonProps?: (rating: FSRSRating, interval: string) => GradeAttributes
  groupLabel?: string
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role={groupLabel ? 'group' : undefined} aria-label={groupLabel}>
      {ratings.map(rating => {
        const next = interval(rating)
        return (
          <Button key={rating} type="button" variant="outline" data-note-grade={rating}
            className={`h-auto min-h-16 flex-col gap-1 whitespace-normal border-2 ${colors[rating - 1]}`}
            disabled={disabled} onClick={event => onGrade(rating, event)} {...buttonProps?.(rating, next)}>
            <span>{translate(locale, labels[rating])}{' '}<kbd className="ml-1 opacity-50">{rating}</kbd></span>
            <span className="text-small font-normal text-text-secondary">{next}</span>
          </Button>
        )
      })}
    </div>
  )
}
