import {
  Brain,
  ClockCounterClockwise,
  Pause,
  Play,
  Swap,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { translate, type AppLocale } from '../../lib/i18n'
import { trackEvent } from '../../lib/telemetry'
import { useLearningWorkspace } from './LearningContext'
import { LegacyPageFlashcards } from './LegacyPageFlashcards'
import { NoteConversionDialog } from './NoteConversionDialog'
import { NoteRecoveryDialog } from './NoteRecoveryDialog'
import {
  joinVaultPath,
  notePathsMatch,
  normalizeNotePathForIdentity,
} from '../../utils/notePathIdentity'

export function NoteLearningPanel({
  path,
  locale,
}: {
  path: string
  locale: AppLocale
}) {
  const workspace = useLearningWorkspace()
  const [busy, setBusy] = useState(false),
    locked = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [conversion, setConversion] = useState(false),
    [recovery, setRecovery] = useState(false),
    [legacy, setLegacy] = useState(false)
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  const refresh = workspace?.refresh,
    client = workspace?.client
  useEffect(() => {
    if (!refresh || !client) return
    void refresh().catch(() => {})
  }, [path, refresh, client])
  if (!workspace) return null
  const page = workspace.pages.find((page) =>
    notePathsMatch(joinVaultPath(workspace.root, page.path), path)
  )
  const view = workspace.notes?.find(
    (row) => row.view.pageId === page?.id
  )?.view
  const oldCards = workspace.cards.filter((card) => card.pageId === page?.id)
  const outside = !normalizeNotePathForIdentity(path).startsWith(
    `${normalizeNotePathForIdentity(workspace.root)}/`
  )
  const enabled = Boolean(view?.config?.enabled)
  const needsConversion = oldCards.length > 0 && !view?.binding
  const change = async () => {
    if (locked.current || outside) return
    locked.current = true
    setBusy(true)
    setError(null)
    try {
      await workspace.setNoteEnabled(path, !enabled)
      trackEvent('memnova_note_learning_toggled', { enabled: enabled ? 0 : 1 })
    } catch (error) {
      if (String(error).includes('note-conversion-required'))
        setConversion(true)
      else if (String(error).includes('note-recovery-required'))
        setRecovery(true)
      trackEvent('memnova_note_learning_toggle_failed', {
        stage: String(error).includes('note-recovery-required')
          ? 'recovery'
          : String(error).includes('note-conversion-required')
            ? 'conversion'
            : 'configure',
      })
      setError(String(error))
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return (
    <section
      className="note-memory-surface h-full overflow-y-auto bg-background p-4 sm:p-8"
      aria-label={t('learning.noteMemory.notes')}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Brain aria-hidden="true" />
            {t('learning.noteMemory.notes')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              view?.config
                ? 'learning.noteMemory.enabledHelp'
                : 'learning.noteMemory.ordinaryHelp'
            )}
          </p>
        </header>
        {(error || workspace.error) && (
          <div
            role="alert"
            className="space-y-2 rounded-lg border border-destructive p-4"
          >
            <p>{t('learning.error')}</p>
            <pre className="whitespace-pre-wrap break-words text-xs">
              {error || workspace.error}
            </pre>
          </div>
        )}
        {view?.state === 'pending' && (
          <p role="status">{t('learning.noteMemory.needsRecovery')}</p>
        )}
        {(view?.state === 'invalid' || view?.state === 'deleted') && (
          <p role="alert">{t('learning.noteMemory.sourceUnavailable')}</p>
        )}
        {view?.state === 'draft' && (
          <p role="status">{t('learning.noteMemory.missingMnemonic')}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {needsConversion ? (
            <Button disabled={busy} onClick={() => setConversion(true)}>
              <Swap aria-hidden="true" />
              {t('learning.noteMemory.title')}
            </Button>
          ) : (
            <Button
              variant={enabled ? 'outline' : 'default'}
              disabled={
                busy ||
                outside ||
                view?.state === 'pending' ||
                view?.state === 'invalid'
              }
              onClick={() => {
                void change()
              }}
            >
              {enabled ? (
                <Pause aria-hidden="true" />
              ) : (
                <Brain aria-hidden="true" />
              )}
              {t(
                enabled
                  ? 'learning.noteMemory.disable'
                  : 'learning.noteMemory.enable'
              )}
            </Button>
          )}
          <Button
            variant="default"
            disabled={busy || view?.state !== 'ready' || !page}
            onClick={() =>
              workspace.requestStudy(page ? [page.id] : [], 'notes')
            }
          >
            <Play aria-hidden="true" />
            {t('learning.study')}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setRecovery(true)}
          >
            <ClockCounterClockwise aria-hidden="true" />
            {t('learning.noteMemory.recoveryTitle')}
          </Button>
        </div>
        {oldCards.length > 0 && (
          <section className="space-y-4 border-t pt-4">
            <Button
              variant="outline"
              aria-expanded={legacy}
              onClick={() => setLegacy((value) => !value)}
            >
              {t('learning.noteMemory.legacyCards')} ({oldCards.length})
            </Button>
            {legacy && <LegacyPageFlashcards path={path} locale={locale} />}
          </section>
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
    </section>
  )
}
