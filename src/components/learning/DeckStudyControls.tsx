import { FlashcardChallenge } from './FlashcardChallenge'
import { challengeQuestions, type ChallengeQuestion } from '../../lib/learning/flashcardChallenge'
import { hasChoicePool } from '../../lib/learning/flashcardQuestions'
import { useId, useState } from 'react'
import { translate, type AppLocale } from '../../lib/i18n'
import { trackEvent } from '../../lib/telemetry'
import { loadDeckStudyMode, saveDeckStudyMode, type FlashcardStudyMode, type ReviewPresentation } from '../../lib/learning/flashcardStudyMode'
import type { LearningCard, LearningPage } from '../../lib/learning/types'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const modes: readonly FlashcardStudyMode[] = ['flip', 'typed', 'choice', 'challenge']

export function DeckStudyControls({
  library, deck, cards, pages, due, locale, label, onStart, primary,
}: {
  library: string
  deck: string
  cards: readonly LearningCard[]
  pages?: readonly LearningPage[]
  due: number
  locale: AppLocale
  label: string
  onStart: (presentation: ReviewPresentation) => void
  primary?: boolean
}) {
  const [selection, setSelection] = useState(() => loadDeckStudyMode(library, deck))
  const [challenge, setChallenge] = useState<ChallengeQuestion[] | null>(null)
  const reason = useId()
  const allCards = deck === 'all'
  const canChoose = !allCards && hasChoicePool(cards)
  const eligible = (mode: FlashcardStudyMode) => (mode !== 'choice' && mode !== 'challenge') || canChoose
  const mode = modes.includes(selection) && eligible(selection) ? selection : 'flip'
  const select = (value: string) => {
    const next = modes.find(item => item === value)
    if (!next || !eligible(next)) return
    setSelection(next)
    saveDeckStudyMode(library, deck, next)
    trackEvent('study_mode_selected', { mode: next })
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Select value={mode} onValueChange={select}>
        <SelectTrigger size="md" layout="responsive" aria-label={translate(locale, 'learning.studyMode.label')} aria-describedby={!canChoose ? reason : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {modes.map(value => <SelectItem key={value} value={value} disabled={!eligible(value)}>{translate(locale, `learning.studyMode.${value}`)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button size="md" variant={primary ? 'default' : 'outline'} disabled={mode === 'challenge' ? !canChoose : !due}
        onClick={() => {
          if (mode !== 'challenge') { onStart({ mode, cards }); return }
          const questions = challengeQuestions(cards, pages)
          if (questions.length) setChallenge(questions)
        }}>
        {label}
      </Button>
      {challenge && <FlashcardChallenge questions={challenge} vaultPath={library} locale={locale} onClose={() => setChallenge(null)} />}
      {!canChoose && <p id={reason} className="basis-full text-small text-text-secondary">{translate(locale, allCards ? 'learning.choice.selectDeck' : 'learning.choice.requiresCards')}</p>}
    </div>
  )
}
