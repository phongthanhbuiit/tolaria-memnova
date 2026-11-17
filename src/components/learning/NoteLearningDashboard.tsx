import {
  Brain,
  ArrowClockwise,
  ClockCounterClockwise,
  Play,
  Stack,
  Swap,
  CaretDown,
  BookOpen,
} from '@phosphor-icons/react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Button } from '../ui/button'
import { translate, type AppLocale } from '../../lib/i18n'
import type { LearningPage } from '../../lib/learning/types'
import { NoteCatalogFilters } from './NoteCatalogFilters'
import { useNoteCatalog } from './useNoteCatalog'
import { NoteMemoryList } from './NoteMemoryList'
import { LearningError } from './LearningError'
import { useLearningWorkspace } from './LearningContext'
import { NoteConversionDialog } from './NoteConversionDialog'
import { NoteRecoveryDialog } from './NoteRecoveryDialog'
import { focusLearningDialogTrigger } from './useLearningDialogFocus'
import { BackupPanel } from './BackupPanel'
import { trackEvent } from '../../lib/telemetry'

interface Props {
  mode: 'home' | 'decks'
  locale: AppLocale
  onOpenPage: (page: LearningPage) => void
  libraryHeader?: ReactNode
  legacy: ReactNode
}
export function NoteLearningDashboard({
  mode,
  locale,
  onOpenPage,
  libraryHeader,
  legacy,
}: Props) {
  const workspace = useLearningWorkspace()
  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null)
  const [lane, setLane] = useState<'notes' | 'legacy'>('notes')
  const catalog = useNoteCatalog(workspace, locale)
  const advancedId = useId()
  const [conversion, setConversion] = useState(false),
    [recovery, setRecovery] = useState(false),
    [advanced, setAdvanced] = useState(false)
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  const refresh = workspace?.refresh,
    client = workspace?.client
  useEffect(() => {
    if (!refresh || !client) return
    void refresh().catch(() => {})
  }, [refresh, client])
  if (!workspace) return null
  const Heading = libraryHeader ? 'h2' : 'h1'
  const { due, rows, dueCount, scope } = catalog
  return (
    <div ref={setScrollParent} className="note-memory-surface app-scrollbar h-full min-h-0 overflow-y-auto">
      {libraryHeader}
      <nav
        className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 border-b px-4 py-2 sm:px-8"
        aria-label={t('learning.library')}
      >
        <Button size="lg" layout="responsive"
          variant={lane === 'notes' ? 'secondary' : 'ghost'}
          aria-pressed={lane === 'notes'}
          onClick={() => {
            setLane('notes')
            trackEvent('memnova_learning_lane_selected', { lane: 'notes' })
          }}
        >
          <Brain aria-hidden="true" />
          {t('learning.noteMemory.notes')} ·{' '}
          {translate(locale, 'decks.due', { n: due.notes.length })}
        </Button>
        <Button size="lg" layout="responsive"
          variant={lane === 'legacy' ? 'secondary' : 'ghost'}
          aria-pressed={lane === 'legacy'}
          onClick={() => {
            setLane('legacy')
            trackEvent('memnova_learning_lane_selected', { lane: 'legacy' })
          }}
        >
          <Stack aria-hidden="true" />
          {t('learning.noteMemory.legacyCards')} ·{' '}
          {translate(locale, 'decks.due', { n: due.legacy.length })}
        </Button>
      </nav>
      {lane === 'legacy' ? (
        legacy
      ) : (
        <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <Heading className="text-xl font-semibold">{t('learning.noteMemory.notes')}</Heading>
              {mode === 'home' && workspace.stats && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {t('home.reviewed')}: {workspace.stats.todayReviews} ·{' '}
                  {t('home.daily_goal')}: {workspace.stats.todayReviews}/
                  {workspace.stats.dailyGoal}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="lg" layout="responsive"
                disabled={!dueCount}
                onClickCapture={focusLearningDialogTrigger}
                onClick={() => workspace.requestStudy(scope, 'notes')}
              >
                <Play aria-hidden="true" />
                {translate(locale, 'learning.noteMemory.studyViewDue', { n: dueCount })}
              </Button>
              <Button size="lg" layout="responsive" variant="ghost" aria-controls={advancedId} aria-expanded={advanced}
                onClick={() => setAdvanced(value => !value)}>
                {t('learning.advanced')}<CaretDown aria-hidden="true" className={advanced ? 'rotate-180' : ''} />
              </Button>
            </div>
          </header>
          {workspace.error && <LearningError error={workspace.error} locale={locale}><Button size="lg" layout="responsive" variant="outline" onClick={() => { void workspace.reconnect() }}><ArrowClockwise aria-hidden="true" />{t('learning.retry')}</Button></LearningError>}
          <div id={advancedId} hidden={!advanced} className="space-y-3">
            {advanced && <>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" layout="responsive" variant="outline" onClickCapture={focusLearningDialogTrigger} onClick={() => setConversion(true)}>
                  <Swap aria-hidden="true" />{t('learning.noteMemory.title')}
                </Button>
                <Button size="lg" layout="responsive" variant="outline" onClickCapture={focusLearningDialogTrigger} onClick={() => setRecovery(true)}>
                  <ClockCounterClockwise aria-hidden="true" />{t('learning.noteMemory.recoveryTitle')}
                </Button>
              </div>
              <BackupPanel locale={locale} />
            </>}
          </div>
          {catalog.hasLearningNotes && <NoteCatalogFilters catalog={catalog} locale={locale} />}
          {!catalog.hasFolderNotes && (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              <BookOpen aria-hidden="true" className="mb-2 size-5" />{t('learning.noteMemory.emptyHelp')}
            </p>
          )}
          <p className="text-sm tabular-nums text-muted-foreground empty:hidden">
            {rows.length > 0 && <>{t('noteList.title.notes')} · {rows.length.toLocaleString(locale)}</>}
          </p>
          <p role="status" className="text-sm text-muted-foreground empty:hidden">
            {catalog.hasFolderNotes && (catalog.query && !rows.length
              ? t('noteList.empty.noMatching')
              : !catalog.query && !dueCount && t('learning.noteMemory.noDue'))}
          </p>
          <NoteMemoryList rows={rows} pages={workspace.pages} clock={workspace.clock} locale={locale} onOpenPage={onOpenPage} scrollParent={scrollParent} />
        </main>
      )}
      <NoteConversionDialog
        client={workspace.client}
        open={conversion}
        locale={locale}
        onOpenChange={setConversion}
        flush={workspace.flush}
        onUpdated={workspace.refreshSources ?? workspace.refresh}
      />
      <NoteRecoveryDialog
        client={workspace.client}
        open={recovery}
        locale={locale}
        onOpenChange={setRecovery}
        onUpdated={workspace.refreshSources ?? workspace.refresh}
      />
    </div>
  )
}
