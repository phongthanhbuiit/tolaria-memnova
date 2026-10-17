import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import type { CardDraft, LearningCard, LearningPage } from '../../lib/learning/types'
import { translate, type TranslationKey, type AppLocale } from '../../lib/i18n'
import { trackEvent } from '../../lib/telemetry'
import { CardForm } from './CardForm'
import { useLearningWorkspace } from './LearningContext'

function cardDraft(card?: LearningCard, position = 0): CardDraft {
  return card ? { front: card.front, back: card.back, answerMode: card.answerMode, answerPageId: card.answerPageId ?? null, status: card.status, position: card.position, properties: structuredClone(card.properties) } : { front: '', back: '', answerMode: 'inline', status: 'draft', position, properties: {} }
}

export function PageFlashcards({ path, locale }: { path: string; locale: AppLocale }) {
  const workspace = useLearningWorkspace()
  const [page, setPage] = useState<{ path: string; page: LearningPage } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<LearningCard | 'new' | null>(null)
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const t = (key: TranslationKey) => translate(locale, key)
  const client = workspace?.client
  const root = client?.vaultPath ?? ''
  const ready = workspace?.phase === 'ready'
  useEffect(() => {
    if (!ready || !client || !path.startsWith(`${root}/`)) return
    let cancelled = false
    client.ensurePage(path.slice(root.length + 1)).then(page => { if (!cancelled) { setPage({ path, page }); setError(null) } }).catch(error => { if (!cancelled) setError(String(error)) })
    return () => { cancelled = true }
  }, [path, ready, client, root, attempt])
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
      {error && <div role="alert" className="rounded-lg border border-destructive p-3"><p>{t('learning.error')}</p><pre className="whitespace-pre-wrap break-words text-xs">{error}</pre><Button variant="outline" onClick={() => { setError(null); setAttempt(value => value + 1); void workspace.refresh().catch(error => setError(String(error))) }}>{t('learning.retry')}</Button></div>}
      {outsideLibrary && <div role="alert" className="rounded-lg border border-destructive p-3"><p>{t('learning.error')}</p><p className="mt-2 break-all text-xs">{path}</p></div>}
      {!current && !error && !outsideLibrary && <p role="status">{t('learning.loading')}</p>}
      {current && !visible.length && <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">{t('learning.empty')}</div>}
      {visible.map(card => <article key={card.id} className="rounded-xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><Button variant="ghost" className="h-auto min-w-0 justify-start whitespace-pre-wrap break-words [overflow-wrap:anywhere] p-0 text-left text-base font-semibold" disabled={card.status === 'trashed'} onClick={() => setEditing(card)}>{card.front || t('learning.draft')}</Button><span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs">{t(`learning.${card.status === 'trashed' ? 'trash' : card.status}`)}</span></div><p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm text-muted-foreground">{card.answerMode === 'page' ? t('learning.wholePage') : card.back}</p><div className="mt-4 flex flex-wrap gap-2">{card.status !== 'trashed' && <><Button variant="outline" size="sm" disabled={busy} onClick={() => { void action(card, 'clone') }}>{t('learning.clone')}</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => { void action(card, card.status === 'suspended' ? 'active' : 'suspended') }}>{t(card.status === 'suspended' ? 'learning.active' : 'learning.suspended')}</Button></>}<Button variant="ghost" size="sm" disabled={busy} onClick={() => { void action(card, card.status === 'trashed' ? 'draft' : 'trashed') }}>{t(card.status === 'trashed' ? 'learning.restore' : 'learning.trash')}</Button></div></article>)}
      {current && editing && <CardForm key={typeof editing === 'string' ? 'new' : editing.id} card={editing === 'new' ? undefined : editing} initialDraft={cardDraft(editing === 'new' ? undefined : editing, Math.max(0, ...cards.map(card => card.position + 1)))} pageId={current.id} locale={locale} onClose={() => setEditing(null)} />}
    </div>
  </section>
}
