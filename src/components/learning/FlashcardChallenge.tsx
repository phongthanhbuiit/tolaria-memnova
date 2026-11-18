import { useEffect, useReducer, useRef } from 'react'
import { translate, type AppLocale } from '../../lib/i18n'
import { trackEvent } from '../../lib/telemetry'
import { CHALLENGE_QUESTIONS, QUESTION_DURATION, challengeRound, startChallenge } from '../../lib/learning/flashcardChallenge'
import type { ChallengeQuestion } from '../../lib/learning/flashcardChallenge'
import { learningMediaUrl } from '../../lib/learning/media'
import { MediaPreview } from './MediaPreview'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { BlockNoteReadOnly } from '../BlockNoteReadOnly'
import { StudyChoiceOptions } from './StudyChoiceOptions'
import './learningStudy.css'

export function FlashcardChallenge({ questions, vaultPath, locale, onClose }: {
  questions: readonly ChallengeQuestion[]
  vaultPath: string
  locale: AppLocale
  onClose: () => void
}) {
  const [round, dispatch] = useReducer(challengeRound, 0, () => startChallenge(Date.now()))
  const reported = useRef(false)
  const { status, correct } = round
  const question = questions[round.index]
  const notePath = question.ownerPath ? `${vaultPath}/${question.ownerPath}` : undefined
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  useEffect(() => {
    if (status !== 'running') return
    const interval = window.setInterval(() => dispatch({ kind: 'tick', now: Date.now() }), 250)
    return () => window.clearInterval(interval)
  }, [status, round.index])
  useEffect(() => {
    if (status !== 'done' || reported.current) return
    reported.current = true
    trackEvent('challenge_completed', { questions: CHALLENGE_QUESTIONS, correct })
  }, [status, correct])

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="learning-study-dialog" showCloseButton={false}>
        <DialogHeader className="learning-study-header">
          <div className="learning-study-heading">
            <DialogTitle className="min-w-0 flex-1 truncate text-title">{t('learning.studyMode.challenge')}</DialogTitle>
            <span className="text-small text-text-secondary tabular-nums">{round.index + 1} / {CHALLENGE_QUESTIONS}</span>
          </div>
          <DialogDescription className="pb-2 text-small text-text-secondary">{t('learning.challenge.practiceOnly')}</DialogDescription>
        </DialogHeader>
        <div className="learning-study-body space-y-4 px-6 py-4">
          {status === 'done' ? (
            <div className="learning-study-terminal">
              <h2 className="text-display">{t('learning.challenge.finished')}</h2>
              <p>{translate(locale, 'learning.challenge.results', { correct, total: CHALLENGE_QUESTIONS, streak: round.bestStreak })}</p>
              <p>{translate(locale, 'learning.challenge.score', { points: correct * 100 })}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap justify-between gap-2 text-small text-text-secondary tabular-nums">
                <span role="timer">{translate(locale, 'learning.challenge.seconds', { seconds: Math.ceil(round.remaining / 1000) })}</span>
                <span>{translate(locale, 'learning.challenge.current', { points: correct * 100, streak: round.streak })}</span>
              </div>
              <div aria-hidden="true" className="h-1 overflow-hidden rounded-sm bg-muted">
                <div className="h-full bg-primary motion-safe:transition-[width]" style={{ width: `${round.remaining / QUESTION_DURATION * 100}%` }} />
              </div>
              <div className="learning-study-face">
                <div className="learning-study-copy">
                  <BlockNoteReadOnly content={question.prompt} locale={locale} preserveBody vaultPath={vaultPath} notePath={notePath} />
                  <MediaPreview src={learningMediaUrl(question.image, vaultPath, notePath)} kind="image" locale={locale} />
                  <MediaPreview src={learningMediaUrl(question.audio, vaultPath, notePath)} kind="audio" locale={locale} />
                </div>
              </div>
              {status === 'paused' && <p role="status">{t('learning.challenge.paused')}</p>}
              <StudyChoiceOptions key={round.index} choices={question.choices} selected={round.selected} locale={locale}
                disabled={status === 'paused'} revealOnTimeout={status === 'feedback' && round.selected === null}
                onChoose={index => dispatch({ kind: 'answer', index, correct: question.choices[index].correct, now: Date.now() })} />
            </>
          )}
        </div>
        <footer className="learning-study-footer">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>{t('learning.close')}</Button>
            {(status === 'running' || status === 'paused') && (
              <Button variant="outline" onClick={() => dispatch({ kind: status === 'paused' ? 'resume' : 'pause', now: Date.now() })}>
                {t(status === 'paused' ? 'learning.challenge.resume' : 'learning.challenge.pause')}
              </Button>
            )}
            {status === 'feedback' && <Button onClick={() => dispatch({ kind: 'next', now: Date.now() })}>
              {t(round.index + 1 === CHALLENGE_QUESTIONS ? 'learning.challenge.finish' : 'learning.challenge.next')}
            </Button>}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
