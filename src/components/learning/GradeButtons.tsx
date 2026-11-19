import { useLayoutEffect, useRef, type ComponentProps, type MouseEvent } from 'react'
import type { FSRSRating } from '../../lib/fsrs'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import { Button } from '../ui/button'
import './gradeButtons.css'

const ratings = [1, 2, 3, 4] as const
const labels: Record<FSRSRating, TranslationKey> = {
  1: 'learning.again',
  2: 'learning.hard',
  3: 'learning.good',
  4: 'learning.easy',
}
type GradeAttributes = Pick<ComponentProps<typeof Button>, 'aria-label'> & { 'data-testid'?: string }

/** Presentation only: each owner keeps its readiness, scheduling and rating lock. */
export function GradeButtons({ locale, disabled, interval, onGrade, buttonProps, groupLabel, focusRating }: {
  locale: AppLocale
  disabled: boolean
  interval: (rating: FSRSRating) => string
  onGrade: (rating: FSRSRating, event: MouseEvent<HTMLButtonElement>) => void
  buttonProps?: (rating: FSRSRating, interval: string) => GradeAttributes
  groupLabel?: string
  focusRating?: FSRSRating
}) {
  const suggestedButton = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    if (!disabled) suggestedButton.current?.focus({ preventScroll: true })
  }, [disabled, focusRating])
  return (
    <div className="study-grade-grid" role={groupLabel ? 'group' : undefined} aria-label={groupLabel}>
      {ratings.map(rating => {
        const next = interval(rating)
        return (
          <Button key={rating} ref={rating === focusRating ? suggestedButton : undefined} type="button" variant="outline" size="study-grade" data-note-grade={rating}
            className="study-grade flex-col items-stretch gap-0 whitespace-normal text-text-primary"
            disabled={disabled} onClick={event => onGrade(rating, event)} {...buttonProps?.(rating, next)}>
            <span className="study-grade-heading"><span className="study-grade-dot" aria-hidden="true" />{translate(locale, labels[rating])}{' '}<kbd className="ml-auto text-caption text-text-secondary">{rating}</kbd></span>
            <span className="text-small font-normal text-text-secondary">{next}</span>
          </Button>
        )
      })}
    </div>
  )
}
