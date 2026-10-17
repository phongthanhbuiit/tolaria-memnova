import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { translate, type AppLocale } from '../../lib/i18n'
import type { LearningPage } from '../../lib/learning/types'
import { useLearningWorkspace } from './LearningContext'
import { calcLevel } from '../../hooks/useStats'
import { trackEvent } from '../../lib/telemetry'

export function LearningDashboard({ mode, locale, onOpenPage }: { mode: 'home' | 'decks'; locale: AppLocale; onOpenPage: (page: LearningPage) => void }) {
  const workspace = useLearningWorkspace()
  const [search, setSearch] = useState('')
  const [goal, setGoal] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backup, setBackup] = useState<{ root: string; id: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  if (!workspace) return null
  const stats = workspace.stats
  const activePages = workspace.pages.filter(page => page.available)
  const pageIds = new Set(activePages.map(page => page.id))
  const cards = workspace.cards.filter(card => card.status !== 'trashed' && pageIds.has(card.pageId))
  const due = cards.filter(card => card.status === 'active' && Date.parse(card.schedule.due) <= workspace.clock)
  const pages = activePages.filter(page => cards.some(card => workspace.scopeForPage(page.id).includes(card.pageId)) && page.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  const saveGoal = async () => {
    const value = Number(goal)
    if (!workspace.client || !Number.isInteger(value) || value < 1 || value > 10000) return
    setBusy(true)
    try { await workspace.client.setDailyGoal(value); await workspace.refresh(); setGoal(null) }
    catch (error) { setError(String(error)) }
    finally { setBusy(false) }
  }
  const createBackup = async () => {
    if (!workspace.client) return
    setBusy(true)
    try { await workspace.flush(); const result = await workspace.client.createBackup(); setBackup({ root: workspace.root, id: result.id }); trackEvent('memnova_backup_created', { files: result.fileCount }) }
    catch (error) { setError(String(error)) }
    finally { setBusy(false) }
  }
  const restoreBackup = async () => {
    if (!workspace.client || backup?.root !== workspace.root) return
    setBusy(true)
    try { const result = await workspace.client.restoreBackup(backup.id); await workspace.openLibrary(result.path); trackEvent('memnova_backup_restored') }
    catch (error) { setError(String(error)) }
    finally { setBusy(false) }
  }
  return <main className="mx-auto max-w-5xl space-y-8 p-5 sm:p-10">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Memnova</p><h1 className="text-3xl font-semibold tracking-tight">{translate(locale, mode === 'home' ? 'learning.library' : 'decks.title')}</h1><p className="mt-2 text-muted-foreground">{translate(locale, 'learning.questionHelp')}</p></div><Button disabled={workspace.phase === 'loading' || (workspace.phase === 'ready' && !due.length)} onClick={() => workspace.requestStudy()}>{translate(locale, workspace.phase === 'ready' ? 'home.start_review' : 'learning.prepare')}</Button></header>
    {(workspace.error || error) && <div role="alert" className="rounded-lg border border-destructive p-4"><p>{translate(locale, 'learning.error')}</p><pre className="my-3 whitespace-pre-wrap break-words text-xs">{error || workspace.error}</pre><Button variant="outline" onClick={() => { void workspace.reconnect() }}>{translate(locale, 'learning.retry')}</Button></div>}
    {workspace.phase === 'loading' && <p role="status">{translate(locale, 'learning.loading')}</p>}
    {workspace.phase !== 'ready' && workspace.phase !== 'loading' && <Card><CardHeader><CardTitle>{translate(locale, 'learning.prepare')}</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">{translate(locale, 'learning.prepareHelp')}</p><Button onClick={() => { void workspace.openMigration() }}>{translate(locale, workspace.phase === 'migrating' ? 'learning.resume' : 'learning.prepare')}</Button></CardContent></Card>}
    {workspace.phase === 'ready' && <>
      {mode === 'home' && stats && <><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[[translate(locale, 'home.due_today_badge'), due.length], [translate(locale, 'home.reviewed'), stats.todayReviews], [translate(locale, 'home.accuracy'), `${stats.todayReviews ? Math.round(stats.todayCorrect / stats.todayReviews * 100) : 0}%`], [translate(locale, 'home.level'), calcLevel(stats.totalXp).level]].map(([label, value]) => <Card key={String(label)}><CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{value}</CardContent></Card>)}</div><Card><CardHeader><CardTitle>{translate(locale, 'home.daily_goal')}</CardTitle></CardHeader><CardContent><div className="flex flex-wrap items-center justify-between gap-4"><span>{stats.todayReviews}/{stats.dailyGoal}</span><div className="flex items-center gap-2"><Input className="w-24" type="number" min={1} max={10000} aria-label={translate(locale, 'home.daily_goal')} value={goal ?? stats.dailyGoal} onChange={event => setGoal(event.target.value)} /><Button variant="outline" disabled={busy || goal === null} onClick={() => { void saveGoal() }}>{translate(locale, 'common.save')}</Button></div></div><div className="mt-4 h-2 overflow-hidden rounded bg-muted" role="progressbar" aria-label={translate(locale, 'home.daily_goal')} aria-valuemin={0} aria-valuemax={stats.dailyGoal} aria-valuenow={Math.min(stats.todayReviews, stats.dailyGoal)}><div className="h-full bg-primary" style={{ width: `${Math.min(100, stats.todayReviews / stats.dailyGoal * 100)}%` }} /></div><div className="mt-5 flex flex-wrap gap-5 text-sm text-muted-foreground"><span>{translate(locale, 'home.total_xp_earned')}: {stats.totalXp}</span><span>{translate(locale, 'home.day_streak', { n: stats.streak })}</span><span>{translate(locale, 'home.study_time')}: {new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay: 'short' }).format(Math.round(stats.todayDurationMs / 60000))}</span></div></CardContent></Card><Card><CardHeader><CardTitle>{translate(locale, 'home.heatmap')}</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-1.5">{Array.from({ length: 180 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - 179 + index); const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; const count = stats.heatmap.find(value => value.date === day)?.count ?? 0; return <span key={day} className={`h-3 w-3 rounded-sm ${count ? 'bg-primary' : 'bg-muted'}`} title={translate(locale, 'home.heatmap_tooltip', { date: new Intl.DateTimeFormat(locale).format(date), n: count })} /> })}</div></CardContent></Card></>}
      <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{translate(locale, 'decks.title')}</h2><Input className="max-w-xs" aria-label={translate(locale, 'decks.title')} placeholder={translate(locale, 'decks.search_placeholder')} value={search} onChange={event => setSearch(event.target.value)} /></div>{!pages.length && <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">{translate(locale, search ? 'decks.empty_search' : 'decks.empty')}</div>}<div className="grid gap-4 sm:grid-cols-2">{pages.map(page => { const ids = workspace.scopeForPage(page.id); const members = cards.filter(card => ids.includes(card.pageId)); const dueCount = due.filter(card => ids.includes(card.pageId)).length; return <Card key={page.id}><CardHeader><CardTitle><Button variant="ghost" className="h-auto whitespace-normal p-0 text-left text-lg" onClick={() => onOpenPage(page)}>{page.title}</Button></CardTitle></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{translate(locale, 'decks.cards_count', { n: members.length })} · {translate(locale, 'decks.due', { n: dueCount })}</span><Button variant="outline" disabled={!dueCount} onClick={() => workspace.requestStudy(ids)}>{translate(locale, 'decks.study_deck')}</Button></CardContent></Card> })}</div></section>
      <div className="rounded-xl border p-4"><Button variant="ghost" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}>{translate(locale, 'learning.advanced')}</Button>{advanced && <div className="mt-4 flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={() => { void createBackup() }}>{translate(locale, 'learning.backup')}</Button>{backup?.root === workspace.root && <Button variant="outline" disabled={busy} onClick={() => { void restoreBackup() }}>{translate(locale, 'learning.restoreBackup')}</Button>}</div>}</div>
    </>}
  </main>
}
