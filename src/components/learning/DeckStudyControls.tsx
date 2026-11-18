import { useState } from 'react'
import { translate, type AppLocale } from '../../lib/i18n'
import { trackEvent } from '../../lib/telemetry'
import { loadDeckStudyMode, saveDeckStudyMode, type FlashcardStudyMode, type ReviewPresentation } from '../../lib/learning/flashcardStudyMode'
import type { LearningCard } from '../../lib/learning/types'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const modes: readonly FlashcardStudyMode[] = ['flip']

export function DeckStudyControls({
  library, deck, cards, due, locale, label, onStart, primary,
}: {
  library: string
  deck: string
  cards: readonly LearningCard[]
  due: number
  locale: AppLocale
  label: string
  onStart: (presentation: ReviewPresentation) => void
  primary?: boolean
}) {
  const [selection, setSelection] = useState(() => loadDeckStudyMode(library, deck))
  const mode = modes.includes(selection) ? selection : 'flip'
  const select = (value: string) => {
    const next = modes.find(item => item === value)
    if (!next) return
    setSelection(next)
    saveDeckStudyMode(library, deck, next)
    trackEvent('study_mode_selected', { mode: next })
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Select value={mode} onValueChange={select}>
        <SelectTrigger size="md" layout="responsive" aria-label={translate(locale, 'learning.studyMode.label')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {modes.map(value => <SelectItem key={value} value={value}>{translate(locale, `learning.studyMode.${value}`)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button size="md" variant={primary ? 'default' : 'outline'} disabled={!due}
        onClick={() => { if (mode !== 'challenge') onStart({ mode, cards }) }}>
        {label}
      </Button>
    </div>
  )
}
