import { useState } from 'react'
import { StudyChoiceOptions } from './StudyChoiceOptions'
import type { ChoiceQuestion } from '../../lib/learning/flashcardQuestions'
import type { AppLocale } from '../../lib/i18n'
import type { AnswerQuality } from '../../lib/learning/flashcardAnswers'

export function MultipleChoiceStudy({ question, disabled, locale, onResult }: {
  question: ChoiceQuestion
  disabled: boolean
  locale: AppLocale
  onResult: (result: AnswerQuality) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  return (
    <div className="mx-6 mb-6">
      <StudyChoiceOptions choices={question.choices} selected={selected} disabled={disabled} locale={locale}
        onChoose={index => {
          if (selected !== null || disabled) return
          setSelected(index)
          onResult(question.choices[index].correct ? 'correct' : 'wrong')
        }} />
    </div>
  )
}
