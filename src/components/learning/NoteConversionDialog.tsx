import { useLearningDialogDismiss, useLearningDialogFocus } from './useLearningDialogFocus'
import { ArrowClockwise, CheckCircle, ClockCounterClockwise, SkipForward, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { translate, type AppLocale } from '../../lib/i18n'
import { NoteConversionChoices } from './NoteConversionChoices'
import { NoteConversionPreview } from './NoteConversionPreview'
import { NoteLegacyDetails } from './NoteLegacyDetails'
import { NoteRecoveryDialog } from './NoteRecoveryDialog'
import { canConvertPage, conversionRows, useNoteConversion, type NoteConversionApi } from './useNoteConversion'
import { LearningError } from './LearningError'
import './noteMemory.css'
interface Props { client: NoteConversionApi | null; open: boolean; locale: AppLocale; onOpenChange: (open: boolean) => void; flush: () => Promise<unknown>; onUpdated: () => Promise<unknown> }
export function NoteConversionDialog(props: Props) {
  if (!props.open) return null
  return <NoteConversionOpenDialog key={`${props.client?.vaultPath}:${props.client?.libraryId}`} client={props.client} open={props.open} locale={props.locale} onOpenChange={props.onOpenChange} flush={props.flush} onUpdated={props.onUpdated} />
}
function NoteConversionOpenDialog({ client,open,locale,onOpenChange,flush,onUpdated }: Props) {
  const { onOpenAutoFocus, onCloseAutoFocus } = useLearningDialogFocus()
  const flow = useNoteConversion({ client,open,flush,onUpdated }), t = (key: Parameters<typeof translate>[1]) => translate(locale,key)
  const [showRecovery,setShowRecovery] = useState(false)
  const dismiss = useLearningDialogDismiss(flow.busy, onOpenChange)
  const rows = flow.preview ? conversionRows(flow.preview).filter(page => !flow.skipped.includes(page.path) && page.classification !== 'bound') : []
  const page = flow.selected
  const status = flow.result?.outcome.status
  return <><Dialog open={open} onOpenChange={dismiss.onOpenChange}><DialogContent onOpenAutoFocus={onOpenAutoFocus} onCloseAutoFocus={onCloseAutoFocus} showCloseButton={false} className="note-memory-dialog" onEscapeKeyDown={dismiss.onEscapeKeyDown}><DialogHeader><DialogTitle>{t('learning.noteMemory.title')}</DialogTitle><DialogDescription>{t('learning.noteMemory.help')}</DialogDescription></DialogHeader>
    <div className="note-memory-body">
      {flow.busy && <p role="status">{t('learning.loading')}</p>}
      {flow.error && <LearningError error={flow.error} locale={locale} />}
      {flow.registrationPartial && <p role="alert">{t('editor.noteMemory.registrationPartial')}</p>}
      {status === 'committed' && <p role="status" className="flex items-center gap-2"><CheckCircle aria-hidden="true" />{t('learning.noteMemory.converted')} · {translate(locale,'learning.noteMemory.keptCards',{ count: flow.result?.retainedLegacyCards ?? 0 })}</p>}
      {status === 'discarded' && <p role="status">{t('learning.noteMemory.keptDisk')}</p>}
      {(status === 'pending' || status === 'conflict') && <p role="status">{t('learning.noteMemory.needsRecovery')}</p>}
      {!!flow.skipped.length && <p>{translate(locale,'learning.noteMemory.skipped',{ count: flow.skipped.length })}</p>}
      {flow.preview && flow.preview.state !== 'ready' && <p role="alert">{t('learning.prepareHelp')}</p>}
      {!flow.busy && !rows.length && !flow.skipped.length && !flow.error && <p>{t('learning.noteMemory.empty')}</p>}
      <nav className="note-memory-sidebar" aria-label={t('learning.noteMemory.title')}>{rows.map(row => <Button key={row.path} variant={page?.path === row.path ? 'secondary' : 'ghost'} disabled={flow.inputsLocked} aria-pressed={page?.path === row.path} onClick={() => flow.selectPage(row.path)}>{row.title}</Button>)}</nav>
      {page && <><p className="note-memory-caption break-words">{page.path}</p>{!canConvertPage(page) && <p role="alert">{t('learning.noteMemory.reviewSource')}</p>}{!page.pageId && <Button disabled={!flow.canPrepareIdentity} onClick={() => { void flow.prepareIdentity() }}>{t('learning.noteMemory.prepareNote')}</Button>}<NoteConversionChoices page={page} pages={flow.preview?.pages ?? []} draft={flow.draft} locale={locale} disabled={flow.inputsLocked || !canConvertPage(page)} onChange={flow.setDraft} /><NoteConversionPreview page={page} pages={flow.preview?.pages ?? []} draft={flow.draft} locale={locale} /><NoteLegacyDetails candidates={page.candidates} locale={locale} /></>}
    </div><div className="note-memory-footer"><Button variant="ghost" disabled={flow.busy} onClick={() => { void flow.reload() }}><ArrowClockwise aria-hidden="true" />{t('learning.noteMemory.refreshPreview')}</Button><Button variant="outline" disabled={flow.busy} onClick={() => setShowRecovery(value => !value)}><ClockCounterClockwise aria-hidden="true" />{t('learning.noteMemory.recoveryTitle')}</Button><Button variant="outline" disabled={flow.inputsLocked || !page} onClick={flow.skip}><SkipForward aria-hidden="true" />{t('learning.noteMemory.skip')}</Button><Button variant="outline" disabled={flow.busy} onClick={() => onOpenChange(false)}><X aria-hidden="true" />{t('common.cancel')}</Button><Button disabled={!flow.canApply} onClick={() => { void flow.apply() }}><CheckCircle aria-hidden="true" />{flow.refreshPending ? t('learning.noteMemory.retryRefresh') : flow.inputsLocked && !flow.busy ? t('learning.retry') : t('learning.noteMemory.apply')}</Button></div>
  </DialogContent></Dialog><NoteRecoveryDialog client={client} open={open && showRecovery} locale={locale} onOpenChange={setShowRecovery} onUpdated={async () => { await onUpdated(); await flow.reload() }} /></>
}
