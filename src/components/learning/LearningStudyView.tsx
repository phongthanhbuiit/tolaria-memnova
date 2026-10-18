import { useEffect, useMemo } from 'react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import type { useLearningStudy } from '../../hooks/useLearningStudy'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import { previewSchedule } from '../../lib/learning/scheduler'
import type { FSRSRating } from '../../lib/fsrs'
import { ArrowUUpLeft, Eye } from '@phosphor-icons/react'

import { LearningStudyFaces } from './LearningStudyFaces'
import { useStudyFaces } from './useStudyFaces'

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
export function LearningStudyView({
  study,
  root,
  locale,
}: {
  study: ReturnType<typeof useLearningStudy>
  root: string
  locale: AppLocale
}) {
  const { open, busy, error, reload } = study
  const session = study.session
  const item = session?.current
  const isNote = item?.content?.kind === 'note'
  const noteDetails =
    item?.content?.kind === 'note' ? item.content.details : null
  const answerPage = isNote
    ? item?.answerPage
    : item?.card.answerMode === 'page' && item.card.answerPageId
      ? item.answerPage
      : item?.page
  const sourceReady =
    !!item?.page &&
    !item.sourceError &&
    (isNote
      ? !!noteDetails && !!answerPage
      : item.card.answerMode === 'inline' || !!answerPage)
  const key = item
    ? `${root}:${study.libraryKey}:${noteDetails?.fingerprint}:${session?.id}:${session?.currentIndex}:${item.card.id}:${item.card.revision}:${item.card.schedule.revision}:${item.page?.fingerprint}:${item.answerPage?.fingerprint}`
    : ''
  const faces = useStudyFaces(key, isNote, open)
  const {
    revealed,
    questionReady,
    answerReady,
    renderFailed,
    scrollContainer,
    mnemonicRegion,
    questionRendered,
    answerRendered,
    questionStatus,
    answerStatus,
    reveal,
    revealButton,
    returnToArticle,
  } = faces
  const t = (key: TranslationKey) => translate(locale, key)
  const preview = useMemo(() => {
    try {
      const at = new Date()
      return item
        ? {
            at: at.getTime(),
            outcomes: previewSchedule(item.card.schedule, at),
          }
        : null
    } catch {
      return null
    }
  }, [item])
  useEffect(() => {
    if (open && questionReady && !revealed) revealButton.current?.focus()
  }, [key, open, questionReady, revealed, revealButton])
  useEffect(() => {
    if (!open || !session?.waitingUntil || busy || error) return
    const timer = setTimeout(
      () => {
        void reload()
      },
      Math.max(0, session.waitingUntil - Date.now()) + 50
    )
    return () => clearTimeout(timer)
  }, [open, reload, busy, error, session?.waitingUntil])
  const interval = (rating: FSRSRating) => {
    if (!preview) return ''
    const minutes = Math.max(
      1,
      Math.ceil(
        (Date.parse(preview.outcomes[rating].due) - preview.at) / 60_000
      )
    )
    return new Intl.RelativeTimeFormat(locale, {
      numeric: 'always',
      style: 'short',
    }).format(
      minutes < 60
        ? minutes
        : minutes < 1440
          ? Math.ceil(minutes / 60)
          : Math.ceil(minutes / 1440),
      minutes < 60 ? 'minute' : minutes < 1440 ? 'hour' : 'day'
    )
  }
  return (
    <Dialog
      open={study.open}
      onOpenChange={(open) => {
        if (!open) void study.close()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[94dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        onEscapeKeyDown={(event) => {
          event.preventDefault()
          void study.close()
        }}
        onKeyDown={(event) => {
          if (
            event.repeat ||
            event.metaKey ||
            event.ctrlKey ||
            event.altKey ||
            study.busy ||
            study.hasPending ||
            study.error ||
            !sourceReady ||
            !questionReady
          )
            return
          if (
            (event.target as HTMLElement).closest(
              'input,textarea,select,button,a,[role="button"],[role="combobox"],[role="textbox"],[contenteditable="true"],.tl-container,.tldraw-whiteboard'
            )
          )
            return
          if (event.key === ' ' && !revealed) {
            event.preventDefault()
            reveal()
          }
          if (revealed && answerReady && /^[1-4]$/.test(event.key)) {
            event.preventDefault()
            void study.rate(Number(event.key) as FSRSRating)
          }
        }}
      >
        <DialogHeader className="border-b p-5">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>
              {item?.page?.title ?? t('learning.study')}
            </DialogTitle>
            <Button
              variant="ghost"
              disabled={study.busy || study.hasPending}
              onClick={() => {
                void study.close()
              }}
            >
              {t('learning.close')}
            </Button>
          </div>
          <DialogDescription>
            {session
              ? `${session.completedCount}/${session.initialCount} · ${translate(locale, 'home.daily_goal_reviews', { n: session.reviewCount })}`
              : t('learning.loading')}
          </DialogDescription>
          {session && (
            <div
              className="mt-3 h-1.5 overflow-hidden rounded bg-muted"
              role="progressbar"
              aria-label={t('decks.progress')}
              aria-valuemin={0}
              aria-valuemax={session.initialCount || 1}
              aria-valuenow={session.completedCount}
            >
              <div
                className="h-full bg-primary transition-[width] motion-reduce:transition-none"
                style={{
                  width: `${session.initialCount ? (session.completedCount / session.initialCount) * 100 : 0}%`,
                }}
              />
            </div>
          )}
        </DialogHeader>
        <div
          ref={scrollContainer}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8"
        >
          {study.error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-destructive p-4"
            >
              <p>{t('learning.error')}</p>
              <pre className="my-3 whitespace-pre-wrap break-words text-xs">
                {study.error}
              </pre>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    void study.retry()
                  }}
                >
                  {t('learning.retry')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    void study.reload()
                  }}
                >
                  {t('learning.reload')}
                </Button>
              </div>
            </div>
          )}
          {renderFailed && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-destructive p-4"
            >
              <p>{t('learning.error')}</p>
              <Button
                variant="outline"
                onClick={() => {
                  void study.reload()
                }}
              >
                {t('learning.reload')}
              </Button>
            </div>
          )}
          {!session && (
            <p role="status">
              {t(study.busy ? 'learning.loading' : 'learning.error')}
            </p>
          )}
          {session?.status === 'completed' && (
            <div className="py-16 text-center">
              <h2 className="text-3xl font-semibold">{t('decks.done_all')}</h2>
              <p className="mt-4 text-muted-foreground">
                {translate(locale, 'home.daily_goal_reviews', {
                  n: session.reviewCount,
                })}
              </p>
            </div>
          )}
          {session?.waitingUntil && !item && (
            <div role="status" className="py-16 text-center">
              <h2 className="text-xl font-semibold">{t('learning.wait')}</h2>
              <p className="mt-3 text-muted-foreground">
                {new Intl.DateTimeFormat(locale, {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                }).format(session.waitingUntil)}
              </p>
            </div>
          )}
          <LearningStudyFaces
            study={study}
            root={root}
            locale={locale}
            faces={{
              snapshotKey: key,
              revealed,
              backVisited: faces.backVisited,
              sourceReady,
              mnemonicRegion,
              questionRendered,
              answerRendered,
              questionStatus,
              answerStatus,
            }}
          />
        </div>
        <footer className="shrink-0 border-t bg-background p-4 sm:px-8">
          <div className="mx-auto max-w-2xl space-y-3">
            {item?.page && !revealed && (
              <Button
                ref={revealButton}
                className="w-full"
                disabled={
                  study.busy || !!study.error || !sourceReady || !questionReady
                }
                onClick={reveal}
              >
                {isNote && <Eye aria-hidden />}
                {t(
                  isNote
                    ? 'learning.noteMemory.showMnemonic'
                    : 'learning.showAnswer'
                )}
              </Button>
            )}
            {isNote && revealed && (
              <Button
                variant="outline"
                className="w-full"
                disabled={study.busy || study.hasPending}
                onClick={returnToArticle}
              >
                <ArrowUUpLeft aria-hidden />
                {t('learning.noteMemory.returnArticle')}
              </Button>
            )}
            {item?.page && revealed && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ratings.map((rating) => (
                  <Button
                    key={rating}
                    variant="outline"
                    className={`h-auto min-h-16 flex-col gap-1 whitespace-normal border-2 ${colors[rating - 1]}`}
                    disabled={
                      study.busy ||
                      study.hasPending ||
                      !!study.error ||
                      !preview ||
                      !sourceReady ||
                      !questionReady ||
                      !answerReady
                    }
                    onClick={() => {
                      void study.rate(rating)
                    }}
                  >
                    <span>
                      {t(labels[rating])}{' '}
                      <kbd className="ml-1 opacity-50">{rating}</kbd>
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {interval(rating)}
                    </span>
                  </Button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={!session?.canUndo || study.busy || study.hasPending}
                onClick={() => {
                  void study.undo()
                }}
              >
                {t('learning.undo')}
              </Button>
              {study.busy && (
                <span role="status" className="text-sm text-muted-foreground">
                  {t('learning.saving')}
                </span>
              )}
            </div>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
