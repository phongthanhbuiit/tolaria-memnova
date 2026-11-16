import {
  ClockCounterClockwise,
  Play,
  PencilSimpleLine,
  SpinnerGap,
  Swap,
  Stack,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { translate, type AppLocale } from '../../lib/i18n'
import { trackEvent } from '../../lib/telemetry'
import { useLearningWorkspace } from './LearningContext'
import { isLibraryNote, noteWorkspaceView } from './noteWorkspaceView'
import { NoteMemoryStatus } from './NoteMemoryStatus'
import { LearningError } from './LearningError'
import { LegacyPageFlashcards } from './LegacyPageFlashcards'
import { NoteConversionDialog } from './NoteConversionDialog'
import { NoteRecoveryDialog } from './NoteRecoveryDialog'
import { focusLearningDialogTrigger } from './useLearningDialogFocus'
import { requestNoteMnemonicEditor } from './noteMemoryEditorActions'
import {
  joinVaultPath,
  notePathsMatch,
} from '../../utils/notePathIdentity'

export function NoteLearningPanel({
  path,
  locale,
  onEditMnemonic,
  compact = false,
}: {
  path: string
  locale: AppLocale
  onEditMnemonic?: () => Promise<void>
  compact?: boolean
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
  const view = noteWorkspaceView(workspace, path)
  const oldCards = workspace.cards.filter(card => card.pageId === page?.id && card.id !== view?.binding?.cardId)
  const outside = !isLibraryNote(workspace.root, path)
  const enabled = Boolean(view?.config?.enabled)
  const needsConversion = oldCards.length > 0 && !view?.binding
  const editMnemonic = async () => {
    if (locked.current || outside) return
    locked.current = true; setBusy(true); setError(null)
    try {
      await (onEditMnemonic ? onEditMnemonic() : requestNoteMnemonicEditor(workspace.root, path))
      trackEvent('memnova_note_mnemonic_edit_requested', { has_back: view?.hasBack ? 1 : 0 })
    } catch (error) { setError(String(error)) }
    finally { locked.current = false; setBusy(false) }
  }
  if (compact && (!workspace.client?.supportsNoteMemory || outside || (!view?.config && !needsConversion && view?.state !== 'pending' && view?.state !== 'invalid'))) return null
  return (
    <section
      className={compact ? "note-memory-surface note-memory-panel px-3 pb-3" : "note-memory-surface note-memory-panel h-full overflow-y-auto bg-background px-4 py-3"}
      aria-label={t('learning.noteMemory.notes')}
    >
      <div className="max-w-2xl space-y-3">
        {!compact && <header className="space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-[13px] font-semibold">
              {t('learning.noteMemory.notes')}
            </h2>
            <NoteMemoryStatus state={view?.state ?? 'ordinary'} due={view?.schedule?.due} clock={workspace.clock} locale={locale} />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(
              view?.state === 'disabled'
                ? 'learning.noteMemory.pausedHelp'
                : view?.config
                  ? 'learning.noteMemory.enabledHelp'
                  : 'learning.noteMemory.ordinaryHelp'
            )}
          </p>
        </header>}
        {(error || workspace.error) && <LearningError error={error || workspace.error || ''} locale={locale} />}
        {busy && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><SpinnerGap aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />{t('learning.saving')}</p>}
        {view?.state === 'pending' && (
          <p role="status">{t('learning.noteMemory.needsRecovery')}</p>
        )}
        {(view?.state === 'invalid' || view?.state === 'deleted') && (
          <p role="alert">{t('learning.noteMemory.sourceUnavailable')}</p>
        )}
        {view?.state === 'draft' && (
          <p role="status">{t('learning.noteMemory.missingMnemonic')}</p>
        )}
        <div className="note-memory-actions">
          {needsConversion && <Button disabled={busy} onClickCapture={focusLearningDialogTrigger} onClick={() => setConversion(true)}>
            <Swap aria-hidden="true" />{t('learning.noteMemory.title')}
          </Button>}
          {((enabled && view?.state === 'draft') || (view?.hasBack && (view.state === 'ready' || view.state === 'disabled'))) && <Button variant="ghost" size="sm" disabled={busy} onClickCapture={focusLearningDialogTrigger} onClick={() => { void editMnemonic() }}><PencilSimpleLine aria-hidden="true" />{t(view?.hasBack ? 'editor.noteMemory.editMnemonic' : 'editor.noteMemory.addMnemonic')}</Button>}
          {view?.state === 'ready' && <Button
            variant="default"
            size={compact ? "sm" : "default"}
            onClickCapture={focusLearningDialogTrigger}
            disabled={busy || !page}
            onClick={() =>
              workspace.requestStudy(page ? [page.id] : [], 'notes')
            }
          >
            <Play aria-hidden="true" />
            {t('learning.noteMemory.studyThisNote')}
          </Button>}
        </div>
        {view?.state === 'pending' && <div className="border-t border-border pt-2">
          <Button
            variant="default"
            size={compact ? "sm" : "default"}
            onClickCapture={focusLearningDialogTrigger}
            disabled={busy}
            onClick={() => setRecovery(true)}
          >
            <ClockCounterClockwise aria-hidden="true" />
            {t('learning.noteMemory.recoveryTitle')}
          </Button>
        </div>}
        {oldCards.length > 0 && (
          <section className="space-y-4 border-t pt-4">
            <Button
              variant="outline"
              aria-expanded={legacy}
              onClick={() => setLegacy((value) => !value)}
            >
              <Stack aria-hidden="true" />{t('learning.noteMemory.legacyCards')} ({oldCards.length})
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
