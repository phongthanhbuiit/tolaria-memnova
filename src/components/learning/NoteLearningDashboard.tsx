import {
  Brain,
  ClockCounterClockwise,
  Play,
  Stack,
  Swap,
} from '@phosphor-icons/react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Button } from '../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { translate, type AppLocale } from '../../lib/i18n'
import type { LearningPage } from '../../lib/learning/types'
import {
  noteFolderPaths,
  noteFolderScope,
  workspaceDue,
} from '../../lib/learning/noteWorkspace'
import { useLearningWorkspace } from './LearningContext'
import { NoteConversionDialog } from './NoteConversionDialog'
import { NoteRecoveryDialog } from './NoteRecoveryDialog'
import { BackupPanel } from './BackupPanel'
import { trackEvent } from '../../lib/telemetry'

interface Props {
  mode: 'home' | 'decks'
  locale: AppLocale
  onOpenPage: (page: LearningPage) => void
  legacy: ReactNode
}
export function NoteLearningDashboard({
  mode,
  locale,
  onOpenPage,
  legacy,
}: Props) {
  const workspace = useLearningWorkspace()
  const [lane, setLane] = useState<'notes' | 'legacy'>('notes')
  const [folder, setFolder] = useState(''),
    [recursive, setRecursive] = useState(true)
  const [conversion, setConversion] = useState(false),
    [recovery, setRecovery] = useState(false),
    [advanced, setAdvanced] = useState(false)
  const recursiveId = useId()
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  const refresh = workspace?.refresh,
    client = workspace?.client
  const [refreshError, setRefreshError] = useState<string | null>(null)
  useEffect(() => {
    if (!refresh || !client) return
    let active = true
    void refresh().catch((error) => {
      if (active) setRefreshError(String(error))
    })
    return () => {
      active = false
    }
  }, [refresh, client])
  if (!workspace) return null
  const due = workspaceDue(
    workspace.pages,
    workspace.notes,
    workspace.cards,
    workspace.clock
  )
  const folders = new Set(noteFolderPaths(workspace.pages))
  const currentFolder = folders.has(folder) ? folder : ''
  const scope = noteFolderScope(currentFolder, workspace.pages, recursive)
  const selected = new Set(scope)
  const prefix = currentFolder ? `${currentFolder}/` : ''
  const rows = workspace.notes.filter(
    (row) =>
      row.view.state !== 'ordinary' &&
      row.view.path.startsWith(prefix) &&
      (recursive || !row.view.path.slice(prefix.length).includes('/'))
  )
  const selectedDue = due.notes.filter((card) => selected.has(card.pageId))
  return (
    <div className="min-h-0 overflow-y-auto">
      <nav
        className="flex flex-wrap items-center gap-2 border-b px-4 py-3"
        aria-label={t('learning.library')}
      >
        <Button
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
        <Button
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
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">
                {t(
                  mode === 'home'
                    ? 'learning.library'
                    : 'learning.noteMemory.notes'
                )}
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {t('learning.noteMemory.ordinaryHelp')}
              </p>
            </div>
            <Button
              disabled={!selectedDue.length}
              onClick={() => workspace.requestStudy(scope, 'notes')}
            >
              <Play aria-hidden="true" />
              {t('learning.study')}
            </Button>
          </header>
          {(workspace.error || refreshError) && (
            <div
              role="alert"
              className="rounded-lg border border-destructive p-4"
            >
              <p>{t('learning.error')}</p>
              <pre className="whitespace-pre-wrap break-words text-xs">
                {workspace.error || refreshError}
              </pre>
              <Button
                variant="outline"
                onClick={() => {
                  void workspace.reconnect()
                }}
              >
                {t('learning.retry')}
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <Select
              value={currentFolder ? `folder:${currentFolder}` : 'root'}
              onValueChange={(value) =>
                setFolder(value === 'root' ? '' : value.slice(7))
              }
            >
              <SelectTrigger
                className="w-full sm:w-72"
                aria-label={t('learning.noteMemory.folder')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">{t('learning.library')}</SelectItem>
                {[...folders].sort().map((path) => (
                  <SelectItem key={path} value={`folder:${path}`}>
                    {path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                id={recursiveId}
                checked={recursive}
                onCheckedChange={setRecursive}
              />
              <Label htmlFor={recursiveId}>
                {t('learning.noteMemory.includeSubfolders')}
              </Label>
            </div>
            <p className="text-sm tabular-nums text-muted-foreground">
              {translate(locale, 'decks.due', { n: selectedDue.length })}
            </p>
          </div>
          {!rows.length && (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              {t('learning.noteMemory.ordinaryHelp')}
            </p>
          )}
          <section
            className="space-y-3"
            aria-label={t('learning.noteMemory.notes')}
          >
            {rows.map((row) => {
              const page = workspace.pages.find(
                (page) => page.id === row.view.pageId
              )
              const status =
                row.view.state === 'ready'
                  ? 'learning.active'
                  : row.view.state === 'disabled'
                    ? 'learning.suspended'
                    : row.view.state === 'pending'
                      ? 'learning.noteMemory.needsRecovery'
                      : row.view.state === 'invalid' ||
                          row.view.state === 'deleted'
                        ? 'learning.error'
                        : 'learning.draft'
              return (
                <article
                  key={row.view.pageId}
                  className="space-y-2 rounded-xl border bg-card p-4"
                >
                  <Button
                    variant="ghost"
                    className="h-auto max-w-full whitespace-normal break-words text-left"
                    disabled={!page?.available}
                    onClick={() => {
                      if (page) onOpenPage(page)
                    }}
                  >
                    {page?.title ?? row.view.path}
                  </Button>
                  <p className="px-3 text-sm text-muted-foreground">
                    {t(status)}
                  </p>
                </article>
              )
            })}
          </section>
          {mode === 'home' && workspace.stats && (
            <p className="text-sm text-muted-foreground">
              {t('home.reviewed')}: {workspace.stats.todayReviews} ·{' '}
              {t('home.daily_goal')}: {workspace.stats.todayReviews}/
              {workspace.stats.dailyGoal}
            </p>
          )}
          <footer className="flex flex-wrap gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setConversion(true)}>
              <Swap aria-hidden="true" />
              {t('learning.noteMemory.title')}
            </Button>
            <Button variant="outline" onClick={() => setRecovery(true)}>
              <ClockCounterClockwise aria-hidden="true" />
              {t('learning.noteMemory.recoveryTitle')}
            </Button>
            <Button
              variant="ghost"
              aria-expanded={advanced}
              onClick={() => setAdvanced((value) => !value)}
            >
              {t('learning.advanced')}
            </Button>
          </footer>
          {advanced && <BackupPanel locale={locale} />}
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
