import { formatDateTimeForDisplay } from '../../utils/dateDisplay'
import { useDateDisplayFormat } from '../../hooks/useAppPreferences'
import { useLearningDialogFocus } from './useLearningDialogFocus'
import './noteMemory.css'
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
import { getLocaleDateLocale, translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import { previewSchedule } from '../../lib/learning/scheduler'
import type { FSRSRating } from '../../lib/fsrs'
import { ArrowClockwise, ArrowLeft, ArrowUUpLeft, Eye, X } from '@phosphor-icons/react'

import { LearningError } from './LearningError'
import { GradeButtons } from './GradeButtons'
import { LearningStudyFaces } from './LearningStudyFaces'
import { useStudyFaces } from './useStudyFaces'
import { useLearningWorkspace } from './LearningContext'
import { workspaceDue } from '../../lib/learning/noteWorkspace'
import type { StudySession } from '../../lib/learning/types'
import { formatStudyInterval } from './reviewDueDisplay'
import './learningStudy.css'

const gradeLabels = ['learning.again', 'learning.hard', 'learning.good', 'learning.easy'] as const

function StudyCompletion({ session, locale }: { session: StudySession; locale: AppLocale }) {
  const dateDisplayFormat = useDateDisplayFormat()
  const numbers = new Intl.NumberFormat(getLocaleDateLocale(locale))
  const { summary } = session
  const dueAt = summary?.nextDueAt
  return (
    <div className="learning-study-terminal">
      <p className="text-body-lg text-text-secondary">
        {translate(locale, 'home.daily_goal_reviews', { n: numbers.format(session.reviewCount) })}
      </p>
      {summary && (
        <dl className="grid w-full max-w-sm grid-cols-2 gap-2 text-start text-body">
          {gradeLabels.map((label, index) => (
            <div key={label} className="flex items-start justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
              <dt className="text-text-secondary">{translate(locale, label)}</dt>
              <dd className="tabular-nums">{numbers.format(summary.grades[index])}</dd>
            </div>
          ))}
        </dl>
      )}
      {dueAt != null && (
        <dl className="mt-2 text-body">
          <dt className="text-text-secondary">{translate(locale, 'learning.session.nextReview')}</dt>
          <dd className="mt-1">
            <time dateTime={new Date(dueAt).toISOString()}>
              {formatDateTimeForDisplay(new Date(dueAt), dateDisplayFormat, locale)}
            </time>
          </dd>
        </dl>
      )}
    </div>
  )
}

function useContinueStudy(session: StudySession | null) {
  const workspace = useLearningWorkspace()
  if (session?.status !== 'completed' || workspace?.phase !== 'ready') return undefined

  const due = workspaceDue(workspace.pages, workspace.notes, workspace.cards, workspace.clock)
  const { lane = 'legacy', pageIds } = session.scope
  if (!due[lane].some(card => pageIds === null || pageIds.includes(card.pageId))) return undefined

  return () => workspace.requestStudy(pageIds ?? undefined, lane)
}

export function LearningStudyView({
  study,
  root,
  locale,
}: {
  study: ReturnType<typeof useLearningStudy>
  root: string
  locale: AppLocale
}) {
  const { onOpenAutoFocus, onCloseAutoFocus } = useLearningDialogFocus()
  const { open, busy, error, reload } = study
  const session = study.session
  const item = session?.current
  const continueStudy = useContinueStudy(session)
  const terminal = !item && (session?.status === 'completed' || !!session?.waitingUntil)
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
    return formatStudyInterval(
      locale,
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
        onOpenAutoFocus={onOpenAutoFocus} onCloseAutoFocus={onCloseAutoFocus}
        showCloseButton={false}
        className="learning-study-dialog"
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
              'input,textarea,select,button,a,[role="button"],[role="combobox"],[role="textbox"],[contenteditable="true"],.tl-container,.excalidraw-whiteboard'
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
        <DialogHeader className="learning-study-header">
          <div className="learning-study-heading">
            <DialogTitle className="min-w-0 flex-1 truncate text-title">
              {session?.status === 'completed' ? t('decks.done_all') : item?.page?.title ?? t('learning.study')}
            </DialogTitle>
            <DialogDescription className="shrink-0 text-small tabular-nums text-text-secondary">
              {session
                ? `${Math.min(session.completedCount + (item ? 1 : 0), session.initialCount)} / ${session.initialCount}`
                : t('learning.loading')}
            </DialogDescription>
            {!terminal && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="study-secondary-action"
              aria-label={t('learning.close')}
              disabled={study.busy || study.hasPending}
              onClick={() => {
                void study.close()
              }}
            >
              <X aria-hidden="true" />
            </Button>
            )}
          </div>

          {session && (
            <div
              className="learning-study-progress"
              role="progressbar"
              aria-label={t('decks.progress')}
              aria-valuemin={0}
              aria-valuemax={session.initialCount || 1}
              aria-valuenow={session.completedCount}
            >
              <div
                className="h-full bg-primary"
                style={{
                  width: `${session.initialCount ? (session.completedCount / session.initialCount) * 100 : 0}%`,
                }}
              />
            </div>
          )}
        </DialogHeader>
        <div
          ref={scrollContainer}
          tabIndex={-1}
          className="learning-study-body"
        >
          {study.error && (
            <LearningError error={study.error} locale={locale}>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    void study.retry()
                  }}
                >
                  <ArrowClockwise aria-hidden="true" />{t('learning.retry')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    void study.reload()
                  }}
                >
                  <ArrowClockwise aria-hidden="true" />{t('learning.reload')}
                </Button>
              </div>
            </LearningError>
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
                <ArrowClockwise aria-hidden="true" />{t('learning.reload')}
              </Button>
            </div>
          )}
          {!session && (
            <p role="status">
              {t(study.busy ? 'learning.loading' : 'learning.error')}
            </p>
          )}
          {session?.status === 'completed' && <StudyCompletion session={session} locale={locale} />}
          {session?.waitingUntil && !item && (
            <div role="status" className="learning-study-terminal">
              <h2 className="text-display">{t('learning.wait')}</h2>
              <p className="text-body-lg text-text-secondary">
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
        <footer className="learning-study-footer">
          <div className="flex flex-col gap-[8px]">
            {terminal && (
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant={continueStudy ? 'outline' : 'default'} disabled={study.busy || study.hasPending} onClick={() => { void study.close() }}>
                  {t('learning.close')}
                </Button>
                {continueStudy && (
                  <Button disabled={study.busy || study.hasPending} onClick={continueStudy}>
                    {t('learning.session.continue')}
                  </Button>
                )}
              </div>
            )}
            {item?.page && !revealed && (
              <Button
                ref={revealButton}
                size="study-reveal"
                className="study-reveal-action w-full"
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

            {item?.page && revealed && (
              <GradeButtons
                locale={locale}
                interval={interval}
                disabled={study.busy || study.hasPending || !!study.error || !preview || !sourceReady || !questionReady || !answerReady}
                onGrade={rating => { void study.rate(rating) }}
              />
            )}
            <div className="flex items-center gap-[8px]">
              {isNote && revealed && (
                <Button
                  variant="ghost"
                  size="sm"
                className="study-secondary-action"
                  disabled={study.busy || study.hasPending}
                  onClick={returnToArticle}
                >
                  <ArrowLeft aria-hidden="true" />
                  {t('editor.noteMemory.backToNote')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="study-secondary-action ml-auto"
                disabled={!session?.canUndo || study.busy || study.hasPending}
                onClick={() => {
                  // Retain focus before Undo disables controls or replaces the snapshot.
                  scrollContainer.current?.focus({ preventScroll: true })
                  void study.undo()
                }}
              >
                <ArrowUUpLeft aria-hidden="true" />{t('learning.undo')}
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
