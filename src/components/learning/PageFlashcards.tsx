import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Switch } from '../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import type { CardDraft, LearningCard, LearningPage } from '../../lib/learning/types'
import { translate, type TranslationKey, type AppLocale } from '../../lib/i18n'
import { trackEvent } from '../../lib/telemetry'
import { useLearningWorkspace } from './LearningContext'

function cardDraft(card?: LearningCard, position = 0): CardDraft {
  return card ? { front: card.front, back: card.back, answerMode: card.answerMode, status: card.status, position: card.position, properties: structuredClone(card.properties) } : { front: '', back: '', answerMode: 'inline', status: 'draft', position, properties: {} }
}
function CardForm({ card, position, pageId, locale, onClose }: { card?: LearningCard; position: number; pageId: string; locale: AppLocale; onClose: () => void }) {
  const workspace = useLearningWorkspace()
  const [operationId] = useState(() => crypto.randomUUID())
  const [draft, setDraft] = useState(() => cardDraft(card, position))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = (key: TranslationKey) => translate(locale, key)
  const save = async () => {
    if (!workspace?.client || busy) return
    setBusy(true); setError(null)
    try {
      if (card) await workspace.client.updateCard(card.id, card.revision, draft)
      else await workspace.client.createCard(pageId, draft, operationId)
      trackEvent(card ? 'memnova_card_updated' : 'memnova_card_created', { mode: draft.answerMode, status: draft.status })
      await workspace.refresh(); onClose()
    } catch (error) { setError(String(error)) }
    finally { setBusy(false) }
  }
  const field = (key: 'front' | 'back', value: string) => setDraft(previous => ({ ...previous, [key]: value }))
  const metadata = (key: string, value: string) => setDraft(previous => ({ ...previous, properties: { ...previous.properties, [key]: value } }))
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
    <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" onEscapeKeyDown={event => { if (busy) event.preventDefault() }} onInteractOutside={event => { if (busy) event.preventDefault() }}>
      <DialogHeader><DialogTitle>{t('learning.cards')}</DialogTitle><DialogDescription>{t('learning.questionHelp')}</DialogDescription></DialogHeader>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium">{t('learning.front')}<Textarea autoFocus value={draft.front} disabled={busy} rows={3} onChange={event => field('front', event.target.value)} /></label>
        <label className="flex items-center justify-between gap-3 text-sm"><span>{t('learning.pageAnswer')}</span><Switch checked={draft.answerMode === 'page'} disabled={busy} onCheckedChange={checked => setDraft(previous => ({ ...previous, answerMode: checked ? 'page' : 'inline' }))} /></label>
        {draft.answerMode === 'inline' && <label className="grid gap-2 text-sm font-medium">{t('learning.back')}<Textarea value={draft.back} disabled={busy} rows={5} onChange={event => field('back', event.target.value)} /></label>}
        <Select value={draft.status} disabled={busy} onValueChange={value => setDraft(previous => ({ ...previous, status: value as CardDraft['status'] }))}><SelectTrigger aria-label={t('learning.active')}><SelectValue /></SelectTrigger><SelectContent>{(['draft', 'active', 'suspended'] as const).map(status => <SelectItem key={status} value={status}>{t(`learning.${status}`)}</SelectItem>)}</SelectContent></Select>
        <div className="grid gap-3 sm:grid-cols-3">{(['IPA', 'audio', 'image'] as const).map(key => <label key={key} className="grid gap-2 text-sm">{key === 'IPA' ? 'IPA' : t(`learning.${key}`)}<Input disabled={busy} value={typeof draft.properties[key] === 'string' ? draft.properties[key] : ''} onChange={event => metadata(key, event.target.value)} /></label>)}</div>
        {error && <div role="alert" className="rounded-md border border-destructive p-3 text-sm"><p>{t('learning.error')}</p><pre className="mt-2 whitespace-pre-wrap break-words text-xs">{error}</pre></div>}
        <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>{t('common.cancel')}</Button><Button disabled={busy} onClick={() => { void save() }}>{t(busy ? 'learning.saving' : 'common.save')}</Button></div>
      </div>
    </DialogContent>
  </Dialog>
}

export function PageFlashcards({ path, locale }: { path: string; locale: AppLocale }) {
  const workspace = useLearningWorkspace()
  const [page, setPage] = useState<{ path: string; page: LearningPage } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<LearningCard | 'new' | null>(null)
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const t = (key: TranslationKey) => translate(locale, key)
  const client = workspace?.client
  const root = client?.vaultPath ?? ''
  const ready = workspace?.phase === 'ready'
  useEffect(() => {
    if (!ready || !client || !path.startsWith(`${root}/`)) return
    let cancelled = false
    client.ensurePage(path.slice(root.length + 1)).then(page => { if (!cancelled) { setPage({ path, page }); setError(null) } }).catch(error => { if (!cancelled) setError(String(error)) })
    return () => { cancelled = true }
  }, [path, ready, client, root])
  if (!workspace) return null
  if (!ready) return <div className="p-8"><Button onClick={() => { void workspace.openMigration() }}>{t('learning.prepare')}</Button>{workspace.error && <p role="alert">{workspace.error}</p>}</div>
  const outsideLibrary = !path.startsWith(`${root}/`)
  const current = !outsideLibrary && page?.path === path ? page.page : null
  const cards = current ? workspace.cards.filter(card => card.pageId === current.id) : []
  const visible = cards.filter(card => filter === 'all' ? card.status !== 'trashed' : card.status === filter)
  const action = async (card: LearningCard, kind: 'clone' | CardDraft['status']) => {
    if (!client || busy) return
    setBusy(true); setError(null)
    try {
      if (kind === 'clone') { const clone = await client.cloneCard(card.id); setEditing(clone) }
      else await client.updateCard(card.id, card.revision, { ...cardDraft(card), status: kind })
      trackEvent('memnova_card_action', { action: kind }); await workspace.refresh()
    } catch (error) { setError(String(error)) }
    finally { setBusy(false) }
  }
  return <section className="h-full overflow-y-auto bg-background p-4 sm:p-8" aria-label={t('learning.cards')}>
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{t('learning.cards')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('learning.questionHelp')}</p></div><div className="flex gap-2"><Button variant="outline" disabled={!current || busy} onClick={() => workspace.requestStudy(current ? [current.id] : [])}>{t('learning.study')}</Button><Button disabled={!current || busy} onClick={() => setEditing('new')}>{t('learning.addCard')}</Button></div></header>
      <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-48" aria-label={t('learning.cards')}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('decks.filter.all')}</SelectItem>{(['draft', 'active', 'suspended', 'trashed'] as const).map(value => <SelectItem key={value} value={value}>{t(`learning.${value === 'trashed' ? 'trash' : value}`)}</SelectItem>)}</SelectContent></Select>
      {error && <div role="alert" className="rounded-lg border border-destructive p-3"><p>{t('learning.error')}</p><pre className="whitespace-pre-wrap break-words text-xs">{error}</pre><Button variant="outline" onClick={() => { void workspace.refresh().catch(error => setError(String(error))) }}>{t('learning.retry')}</Button></div>}
      {outsideLibrary && <div role="alert" className="rounded-lg border border-destructive p-3"><p>{t('learning.error')}</p><p className="mt-2 break-all text-xs">{path}</p></div>}
      {!current && !error && !outsideLibrary && <p role="status">{t('learning.loading')}</p>}
      {current && !visible.length && <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">{t('learning.empty')}</div>}
      {visible.map(card => <article key={card.id} className="rounded-xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><Button variant="ghost" className="h-auto min-w-0 justify-start whitespace-pre-wrap p-0 text-left text-base font-semibold" onClick={() => setEditing(card)}>{card.front || t('learning.draft')}</Button><span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs">{t(`learning.${card.status === 'trashed' ? 'trash' : card.status}`)}</span></div><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{card.answerMode === 'page' ? t('learning.pageAnswer') : card.back}</p><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={() => { void action(card, 'clone') }}>{t('learning.clone')}</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => { void action(card, card.status === 'suspended' ? 'active' : 'suspended') }}>{t(card.status === 'suspended' ? 'learning.active' : 'learning.suspended')}</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => { void action(card, card.status === 'trashed' ? 'draft' : 'trashed') }}>{t(card.status === 'trashed' ? 'learning.restore' : 'learning.trash')}</Button></div></article>)}
      {current && editing && <CardForm key={typeof editing === 'string' ? 'new' : editing.id} card={editing === 'new' ? undefined : editing} position={Math.max(0, ...cards.map(card => card.position + 1))} pageId={current.id} locale={locale} onClose={() => setEditing(null)} />}
    </div>
  </section>
}
