import { useLayoutEffect, useRef } from 'react'
import { translate, type AppLocale } from '../../lib/i18n'
import type { StudyChoice } from '../../lib/learning/flashcardQuestions'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

const choicesKeys = 'ABCD'

export function StudyChoiceOptions({ choices, selected, disabled, locale, onChoose, revealOnTimeout = false }: {
  choices: readonly StudyChoice[]
  selected: number | null
  disabled: boolean
  locale: AppLocale
  onChoose: (index: number) => void
  revealOnTimeout?: boolean
}) {
  const first = useRef<HTMLButtonElement>(null)
  const feedback = useRef<HTMLParagraphElement>(null)
  const complete = selected !== null || revealOnTimeout
  useLayoutEffect(() => {
    if (complete) feedback.current?.focus({ preventScroll: true })
    else if (!disabled) first.current?.focus({ preventScroll: true })
  }, [complete, disabled, choices])

  return (
    <div className="space-y-3" role="group" aria-label={translate(locale, 'learning.choice.label')} onKeyDown={event => {
      const index = choicesKeys.indexOf(event.key.toUpperCase())
      if (disabled || complete || index < 0 || event.key.length !== 1 || event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.nativeEvent.isComposing) return
      event.preventDefault()
      onChoose(index)
    }}>
      <div className="grid gap-2 sm:grid-cols-2">
        {choices.map((choice, index) => {
          const state = complete && choice.correct ? 'correct' : selected === index ? 'wrong' : null
          return (
            <Button ref={index === 0 ? first : undefined} key={choice.label} variant="outline" layout="responsive" size="md"
              disabled={disabled || complete} onClick={() => onChoose(index)}
              className={cn('min-w-0 justify-start gap-2 whitespace-normal text-left', {
                'border-primary/50 bg-primary/10 disabled:opacity-100': state === 'correct',
                'border-destructive/50 bg-destructive/10 disabled:opacity-100': state === 'wrong',
              })}>
              <kbd className="rounded-sm bg-muted px-1.5 text-caption text-text-secondary">{choicesKeys[index]}</kbd>
              <span className="min-w-0 break-words">{choice.label}</span>
              {state && <span className={state === 'correct' ? 'ml-auto text-primary' : 'ml-auto text-destructive'}>
                {translate(locale, `learning.answers.${state}`)}
              </span>}
            </Button>
          )
        })}
      </div>
      {complete && (
        <p ref={feedback} tabIndex={-1} role="status" className="text-body text-text-secondary">
          {translate(locale, selected === null ? 'learning.challenge.timeout' : choices[selected]?.correct ? 'learning.answers.correct' : 'learning.answers.wrong')}
        </p>
      )}
    </div>
  )
}
