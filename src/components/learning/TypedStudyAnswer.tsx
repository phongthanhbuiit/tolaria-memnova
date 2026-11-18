import { useLayoutEffect, useRef, useState } from 'react'
import { translate, type AppLocale } from '../../lib/i18n'
import { scoreTypedAnswer, type AnswerQuality } from '../../lib/learning/flashcardAnswers'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export function TypedStudyAnswer({ answer, locale, disabled, onResult }: {
  answer: string
  locale: AppLocale
  disabled: boolean
  onResult: (quality: AnswerQuality) => void
}) {
  const [value, setValue] = useState('')
  const [result, setResult] = useState<AnswerQuality | null>(null)
  const composing = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const feedback = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (result) feedback.current?.focus({ preventScroll: true })
    else if (!disabled) input.current?.focus({ preventScroll: true })
  }, [disabled, result])

  const submit = () => {
    if (!value.trim() || disabled || composing.current) return
    const quality = scoreTypedAnswer(value, answer)
    setResult(quality)
    onResult(quality)
  }

  if (result) return (
    <div tabIndex={-1} ref={feedback} className="mx-6 mb-6 space-y-3 rounded-lg bg-muted/40 p-4">
      <p role="status" className="text-body font-medium text-text-primary">{translate(locale, `learning.answers.${result}`)}</p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-small text-text-secondary">{translate(locale, 'learning.answers.yours')}</dt>
          <dd className="break-words text-body-lg">{value.trim()}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-small text-text-secondary">{translate(locale, 'learning.answers.expected')}</dt>
          <dd className="break-words text-body-lg">{answer}</dd>
        </div>
      </dl>
    </div>
  )

  return (
    <div className="mx-6 mb-6 flex flex-wrap items-center gap-2">
      <Input ref={input} className="min-w-0 flex-1" value={value} disabled={disabled}
        aria-label={translate(locale, 'learning.answers.yours')}
        placeholder={translate(locale, 'learning.answers.placeholder')}
        onChange={event => setValue(event.target.value)}
        onCompositionStart={() => { composing.current = true }}
        onCompositionEnd={() => { composing.current = false }}
        onKeyDown={event => {
          if (event.key !== 'Enter' || event.repeat || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
          event.preventDefault()
          submit()
        }} />
      <Button type="button" disabled={disabled || !value.trim()} onClick={submit}>{translate(locale, 'learning.answers.check')}</Button>
    </div>
  )
}
