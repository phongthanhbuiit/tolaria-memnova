import { useId, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { SourcePagePicker } from './SourcePagePicker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import type { CardDraft, LearningCard, LearningProperty } from '../../lib/learning/types'
import { translate, type TranslationKey, type AppLocale } from '../../lib/i18n'
import { trackEvent } from '../../lib/telemetry'
import { VocabularyFields } from './VocabularyFields'
import { useLearningWorkspace } from './LearningContext'

export function CardForm({ card, initialDraft, pageId, locale, onClose }: { card?: LearningCard; initialDraft: CardDraft; pageId: string; locale: AppLocale; onClose: () => void }) {
  const workspace = useLearningWorkspace()
  const statusId = useId()
  const [operationId] = useState(() => crypto.randomUUID())
  const [draft, setDraft] = useState(() => initialDraft)
  const [answerChoice, setAnswerChoice] = useState(initialDraft.answerMode === 'inline' ? 'inline' : initialDraft.answerPageId ? 'other' : 'current')
  const [otherSource, setOtherSource] = useState(initialDraft.answerPageId ?? null)
  const [sourceBusy, setSourceBusy] = useState(false)
  const [persisted, setPersisted] = useState(card)
  const [savedDraft, setSavedDraft] = useState<CardDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = (key: TranslationKey) => translate(locale, key)
  const save = async () => {
    if (!workspace?.client || busy || sourceBusy || (answerChoice === 'other' && !draft.answerPageId)) return
    setBusy(true); setError(null)
    try {
      if (savedDraft !== draft) {
        const saved = persisted
          ? await workspace.client.updateCard(persisted.id, persisted.revision, draft)
          : await workspace.client.createCard(pageId, draft, operationId)
        setPersisted(saved); setSavedDraft(draft)
        trackEvent(persisted ? 'memnova_card_updated' : 'memnova_card_created', { mode: draft.answerMode, answer_source: draft.answerMode === 'inline' ? 'inline' : draft.answerPageId ? 'linked' : 'owner', status: draft.status, card_type: draft.properties.card_type === 'vocabulary' ? 'vocabulary' : 'basic' })
      }
      await workspace.refresh(); onClose()
    } catch (error) { setError(String(error)) }
    finally { setBusy(false) }
  }
  const field = (key: 'front' | 'back', value: string) => setDraft(previous => ({ ...previous, [key]: value }))
  const metadata = (key: string, value: LearningProperty) => setDraft(previous => ({ ...previous, properties: { ...previous.properties, [key]: value } }))
  return <Dialog open onOpenChange={open => { if (!open && !busy && !sourceBusy) onClose() }}>
    <DialogContent showCloseButton={false} className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl" onEscapeKeyDown={event => { if (busy || sourceBusy) event.preventDefault() }} onInteractOutside={event => { if (busy || sourceBusy) event.preventDefault() }}>
      <DialogHeader className="shrink-0 border-b p-5"><DialogTitle>{t(persisted ? 'learning.editCard' : 'learning.addCard')}</DialogTitle><DialogDescription>{t('learning.questionHelp')}</DialogDescription></DialogHeader>
      <div className="grid min-h-0 gap-5 overflow-y-auto overscroll-contain p-5">
        <label className="grid gap-2 text-sm font-medium">{t('learning.front')}<Textarea name="front" autoComplete="off" autoFocus value={draft.front} disabled={busy} rows={3} onChange={event => field('front', event.target.value)} /></label>
        <div className="grid gap-2 text-sm"><span id={`${statusId}-answer-label`}>{t('learning.answerMode')}</span><Select value={answerChoice} disabled={busy || sourceBusy} onValueChange={value => { setAnswerChoice(value); setDraft(previous => ({ ...previous, answerMode: value === 'inline' ? 'inline' : 'page', answerPageId: value === 'other' ? otherSource : null })) }}><SelectTrigger aria-labelledby={`${statusId}-answer-label`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inline">{t('learning.answerInline')}</SelectItem><SelectItem value="current">{t('learning.answerCurrent')}</SelectItem><SelectItem value="other">{t('learning.answerOther')}</SelectItem></SelectContent></Select></div>
        {answerChoice === 'other' && <SourcePagePicker value={draft.answerPageId ?? null} locale={locale} disabled={busy} onBusyChange={setSourceBusy} onChange={page => { setOtherSource(page.id); setDraft(previous => ({ ...previous, answerPageId: page.id })) }} />}
        {draft.answerMode === 'inline' && <label className="grid gap-2 text-sm font-medium">{t('learning.back')}<Textarea name="back" autoComplete="off" value={draft.back} disabled={busy} rows={5} onChange={event => field('back', event.target.value)} /></label>}
        <div className="grid gap-2 text-sm"><label htmlFor={statusId}>{t('learning.status')}</label><Select value={draft.status} disabled={busy} onValueChange={value => setDraft(previous => ({ ...previous, status: value as CardDraft['status'] }))}><SelectTrigger id={statusId}><SelectValue /></SelectTrigger><SelectContent>{(['draft', 'active', 'suspended'] as const).map(status => <SelectItem key={status} value={status}>{t(`learning.${status}`)}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-3 sm:grid-cols-3">{(['IPA', 'audio', 'image'] as const).map(key => <label key={key} className="grid gap-2 text-sm">{key === 'IPA' ? 'IPA' : t(`learning.${key}`)}<Input name={key} autoComplete="off" spellCheck={false} disabled={busy} value={typeof draft.properties[key] === 'string' ? draft.properties[key] : ''} onChange={event => metadata(key, event.target.value)} /></label>)}</div>
        <VocabularyFields properties={draft.properties} locale={locale} disabled={busy} onChange={metadata} />
        {error && <div role="alert" className="rounded-md border border-destructive p-3 text-sm"><p>{t(savedDraft === draft ? 'learning.savedRefreshFailed' : 'learning.error')}</p><pre className="mt-2 whitespace-pre-wrap break-words text-xs">{error}</pre></div>}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t bg-background p-4"><Button variant="outline" disabled={busy || sourceBusy} onClick={onClose}>{t('common.cancel')}</Button><Button disabled={busy || sourceBusy || (answerChoice === 'other' && !draft.answerPageId)} onClick={() => { void save() }}>{t(busy ? 'learning.saving' : error && savedDraft === draft ? 'learning.retry' : 'common.save')}</Button></div>
    </DialogContent>
  </Dialog>
}

