import { DeckStudyControls } from './DeckStudyControls'
import { useState } from 'react'
import { Files, NotePencil } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { translate, type AppLocale } from '../../lib/i18n'
import type { LearningPage } from '../../lib/learning/types'
import { useLearningWorkspace } from './LearningContext'
import { calcLevel } from '../../hooks/useStats'
import { BackupPanel } from './BackupPanel'
import { NoteLearningDashboard } from './NoteLearningDashboard'

interface DashboardProps {
  mode: 'home' | 'decks'
  locale: AppLocale
  onOpenPage: (page: LearningPage) => void
}

type LibraryActions = { onBrowseAllNotes: () => void; onCreateNote: () => void }

function LibraryHeader({ locale, studyReady, onBrowseAllNotes, onCreateNote }: LibraryActions & { locale: AppLocale; studyReady: boolean }) {
  return <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 pb-5 pt-6 sm:px-8 sm:pt-8">
    <div className="min-w-0 max-w-prose space-y-1">
      <h1 className="text-display font-semibold tracking-tight">{translate(locale, 'sidebar.nav.home')}</h1>
      {studyReady && <p className="text-body-lg text-muted-foreground">{translate(locale, 'learning.libraryWritingHelp')}</p>}
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="lg" variant="outline" onClick={onBrowseAllNotes}><Files aria-hidden="true" />{translate(locale, 'sidebar.nav.allNotes')}</Button>
      <Button size="lg" variant="outline" onClick={onCreateNote}><NotePencil aria-hidden="true" />{translate(locale, 'command.note.newNote')}</Button>
    </div>
  </header>
}

export function LearningDashboard({ mode, locale, onOpenPage, onBrowseAllNotes, onCreateNote }: DashboardProps & LibraryActions) {
  const workspace = useLearningWorkspace()
  const client = workspace?.client
  const studyReady = client?.supportsNoteMemory && workspace?.phase === 'ready'
  const libraryHeader = mode === 'home' && <LibraryHeader locale={locale} studyReady={Boolean(studyReady)} onBrowseAllNotes={onBrowseAllNotes} onCreateNote={onCreateNote} />
  const legacy = <LegacyLearningDashboard mode={mode} locale={locale} onOpenPage={onOpenPage} embedded={Boolean(studyReady)} />
  return studyReady
    ? <NoteLearningDashboard key={`${workspace.root}:${client.libraryId}`} mode={mode} locale={locale} onOpenPage={onOpenPage} libraryHeader={libraryHeader} legacy={legacy} />
    : <>{libraryHeader}{legacy}</>
}

function LegacyLearningDashboard({ mode, locale, onOpenPage, embedded }: DashboardProps & { embedded: boolean }) {
  const Heading = mode === 'home' ? 'h2' : 'h1'
  const workspace = useLearningWorkspace()
  const [search, setSearch] = useState('')
  const [goal, setGoal] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
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
  return <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4"><div>{!embedded && <Heading className="text-display font-semibold">{translate(locale, 'sidebar.nav.decks')}</Heading>}<p className="mt-2 text-muted-foreground">{translate(locale, 'learning.questionHelp')}</p></div>{workspace.phase === 'ready' && (
      <DeckStudyControls library={workspace.root} deck="all" cards={cards} due={due.length} locale={locale}
        label={translate(locale, 'home.start_review')} primary onStart={presentation => workspace.requestStudy(undefined, 'legacy', presentation)} />
    )}
    {workspace.phase === 'error' && <Button onClick={() => { void workspace.reconnect() }}>{translate(locale, 'learning.retry')}</Button>}</header>
    {(workspace.error || error) && <div role="alert" className="rounded-lg border border-destructive p-4"><p>{translate(locale, 'learning.error')}</p><pre className="my-3 whitespace-pre-wrap break-words text-small">{error || workspace.error}</pre><Button variant="outline" onClick={() => { void workspace.reconnect() }}>{translate(locale, 'learning.retry')}</Button></div>}
    {workspace.phase === 'loading' && <p role="status">{translate(locale, 'learning.loading')}</p>}
    {workspace.phase === 'error' && <BackupPanel locale={locale} />}
    {workspace.phase !== 'ready' && workspace.phase !== 'loading' && workspace.phase !== 'error' && <Card><CardContent className="pt-6"><p className="mb-4 text-body text-muted-foreground">{translate(locale, 'learning.prepareHelp')}</p><Button onClick={() => { void workspace.openMigration() }}>{translate(locale, workspace.phase === 'migrating' ? 'learning.resume' : 'learning.prepare')}</Button></CardContent></Card>}
    {workspace.phase === 'ready' && <>
      {mode === 'home' && stats && <><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[[translate(locale, 'home.due_today_badge'), due.length], [translate(locale, 'home.reviewed'), stats.todayReviews], [translate(locale, 'home.accuracy'), `${stats.todayReviews ? Math.round(stats.todayCorrect / stats.todayReviews * 100) : 0}%`], [translate(locale, 'home.level'), calcLevel(stats.totalXp).level]].map(([label, value]) => <Card key={String(label)}><CardHeader className="pb-2"><CardTitle className="text-body font-normal text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="text-title font-semibold tabular-nums">{value}</CardContent></Card>)}</div><Card><CardHeader><CardTitle>{translate(locale, 'home.daily_goal')}</CardTitle></CardHeader><CardContent><div className="flex flex-wrap items-center justify-between gap-4"><span>{stats.todayReviews}/{stats.dailyGoal}</span><div className="flex items-center gap-2"><Input type="number" min={1} max={10000} aria-label={translate(locale, 'home.daily_goal')} value={goal ?? stats.dailyGoal} onChange={event => setGoal(event.target.value)} /><Button variant="outline" disabled={busy || goal === null} onClick={() => { void saveGoal() }}>{translate(locale, 'common.save')}</Button></div></div><div className="mt-4 h-2 overflow-hidden rounded-sm bg-muted" role="progressbar" aria-label={translate(locale, 'home.daily_goal')} aria-valuemin={0} aria-valuemax={stats.dailyGoal} aria-valuenow={Math.min(stats.todayReviews, stats.dailyGoal)}><div className="h-full bg-primary" style={{ width: `${Math.min(100, stats.todayReviews / stats.dailyGoal * 100)}%` }} /></div><div className="mt-5 flex flex-wrap gap-5 text-body text-muted-foreground"><span>{translate(locale, 'home.total_xp_earned')}: {stats.totalXp}</span><span>{translate(locale, 'home.day_streak', { n: stats.streak })}</span><span>{translate(locale, 'home.study_time')}: {new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay: 'short' }).format(Math.round(stats.todayDurationMs / 60000))}</span></div></CardContent></Card><Card><CardHeader><CardTitle>{translate(locale, 'home.heatmap')}</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-1.5">{Array.from({ length: 180 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - 179 + index); const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; const count = stats.heatmap.find(value => value.date === day)?.count ?? 0; return <span key={day} className={`h-3 w-3 rounded-sm ${count ? 'bg-primary' : 'bg-muted'}`} title={translate(locale, 'home.heatmap_tooltip', { date: new Intl.DateTimeFormat(locale).format(date), n: count })} /> })}</div></CardContent></Card></>}
      <section className="space-y-4" aria-label={translate(locale, 'decks.title')}><div className="flex flex-wrap justify-end gap-3"><Input className="max-w-xs" aria-label={translate(locale, 'decks.title')} placeholder={translate(locale, 'decks.search_placeholder')} value={search} onChange={event => setSearch(event.target.value)} /></div>{!pages.length && <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">{translate(locale, search ? 'decks.empty_search' : 'decks.empty')}</div>}<div className="grid gap-4 sm:grid-cols-2">{pages.map(page => { const ids = workspace.scopeForPage(page.id); const members = cards.filter(card => ids.includes(card.pageId)); const dueCount = due.filter(card => ids.includes(card.pageId)).length; return <Card key={page.id}><CardHeader><CardTitle><Button variant="toolbar" size="toolbar" className="whitespace-normal text-left text-title" onClick={() => onOpenPage(page)}>{page.title}</Button></CardTitle></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3"><span className="text-body text-muted-foreground">{translate(locale, 'decks.cards_count', { n: members.length })} · {translate(locale, 'decks.due', { n: dueCount })}</span><DeckStudyControls library={workspace.root} deck={page.id} cards={members} due={dueCount} locale={locale}
        label={translate(locale, 'decks.study_deck')} onStart={presentation => workspace.requestStudy(ids, 'legacy', presentation)} /></CardContent></Card> })}</div></section>
    </>}
  </main>
}
