import { useId, useRef, useState } from 'react'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import type { NoteMemoryView } from '../../lib/learning/types'
import { trackEvent } from '../../lib/telemetry'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { LearningError } from './LearningError'
import { useLearningWorkspace } from './LearningContext'
import { isLibraryNote, noteWorkspaceView } from './noteWorkspaceView'

function switchHint(view?: NoteMemoryView): TranslationKey | undefined {
  if (view?.legacyCardCount && !view.binding) return 'learning.noteMemory.title'
  switch (view?.state) {
    case 'pending': return 'learning.noteMemory.needsRecovery'
    case 'invalid':
    case 'deleted': return 'learning.noteMemory.sourceUnavailable'
    case 'disabled': return 'learning.noteMemory.pausedHelp'
    default: return undefined
  }
}

/** Mounted per Library and note so a pending write cannot update the next inspector. */
export function NoteMemorySwitch({ path, locale }: { path: string; locale: AppLocale }) {
  const workspace = useLearningWorkspace()
  const id = useId()
  const locked = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!workspace?.client?.supportsNoteMemory || !isLibraryNote(workspace.root, path)) return null

  const view = noteWorkspaceView(workspace, path)
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  const ready = workspace.phase === 'ready'
  const hint = switchHint(view)
  const blocked = hint !== undefined && hint !== 'learning.noteMemory.pausedHelp'
  async function change(enabled: boolean) {
    if (locked.current || !workspace || !ready || blocked) return
    locked.current = true
    setBusy(true)
    setError(null)
    try {
      await workspace.setNoteEnabled(path, enabled)
      trackEvent('memnova_note_learning_toggled', { enabled: enabled ? 1 : 0 })
    } catch (cause) {
      const detail = String(cause)
      setError(detail)
      trackEvent('memnova_note_learning_toggle_failed', { stage: detail.includes('note-recovery-required') ? 'recovery' : detail.includes('note-conversion-required') ? 'conversion' : 'configure' })
      void workspace.refresh().catch(() => {})
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return <div className="note-memory-surface space-y-1 px-3 py-2">
    <div className="flex items-center justify-between gap-2">
      {ready ? <>
        <Label htmlFor={id} className="min-h-6 flex-1">{t('properties.spacedRepetition')}</Label>
        <Switch id={id} aria-describedby={hint ? `${id}-hint` : undefined} checked={Boolean(view?.config?.enabled)} disabled={busy || blocked} onCheckedChange={value => void change(value)} />
      </> : <>
        <span className="text-xs">{t('properties.spacedRepetition')}</span>
        <Button variant="ghost" size="sm" disabled={workspace.busy || workspace.phase === 'loading'} onClick={() => void workspace.openMigration()}>{t('learning.prepare')}</Button>
      </>}
    </div>
    {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{t(hint)}</p>}
    {error && <LearningError error={error} locale={locale} />}
  </div>
}
