/**
 * HomePage.tsx
 *
 * Bento-style Dashboard for Tolaria Flashcard Workspace.
 * Shows stats, gamification info, heatmap, and quick deck action hooks.
 *
 * Progress ring uses actual card clearance rate (todayReviews / startOfDayDue)
 * rather than a fixed daily goal number.
 */

import { useMemo, useRef, useState } from 'react'
import {
  Brain,
  CalendarBlank,
  CheckCircle,
  FireSimple,
  PencilSimple,
  Play,
  Sparkle,
  Timer,
  Trophy,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { translate } from '../lib/i18n'
import type { AppLocale } from '../lib/i18n'
import type { VaultEntry } from '../types'
import { getDueReviewCount, isFSRSEnabled, collectDeckMembers, isFSRSEntryDue } from '../lib/fsrsVaultEntry'
import type { StudyStats } from '../hooks/useStats'

interface HomePageProps {
  stats: StudyStats
  level: number
  currentLevelXP: number
  nextLevelXP: number
  entries: VaultEntry[]
  onStartReview: () => void
  onNavigate: (selection: { kind: 'filter'; filter: 'decks' }) => void
  onUpdateDailyGoal: (goal: number) => void
  locale?: AppLocale
}

export function HomePage({
  stats,
  level,
  currentLevelXP,
  nextLevelXP,
  entries,
  onStartReview,
  onNavigate,
  onUpdateDailyGoal,
  locale = 'en',
}: HomePageProps) {
  const hour = new Date().getHours()
  const greeting = useMemo(() => {
    if (hour < 12) return translate(locale, 'home.greeting_morning')
    if (hour < 18) return translate(locale, 'home.greeting_afternoon')
    return translate(locale, 'home.greeting_evening')
  }, [hour, locale])

  // Inline-edit state for daily goal badge
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState(String(stats.dailyGoal))
  const goalInputRef = useRef<HTMLInputElement>(null)

  const startEditGoal = () => {
    setGoalDraft(String(stats.dailyGoal))
    setEditingGoal(true)
    // Focus after state update
    setTimeout(() => goalInputRef.current?.select(), 0)
  }

  const commitGoal = () => {
    const parsed = parseInt(goalDraft, 10)
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateDailyGoal(parsed)
    }
    setEditingGoal(false)
  }

  const formatStudyTime = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000)
    if (totalMinutes < 60) return `${totalMinutes}m`
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes}m`
  }

  // ---------------------------------------------------------------------------
  // Deck data for "Continue Learning" bento
  // ---------------------------------------------------------------------------
  const decksData = useMemo(() => {
    const potentialDecks = entries.filter(
      (e) => e.isA === 'Type' || entries.some((child) => child.belongsTo.some((ref) => ref.includes(e.title))),
    )

    return potentialDecks
      .map((deck) => {
        const members = collectDeckMembers(deck, entries)
        const fsrsMembers = members.filter((m) => isFSRSEnabled(m))
        if (fsrsMembers.length === 0) return null

        const dueCount = fsrsMembers.filter((m) => isFSRSEntryDue(m)).length
        return { entry: deck, totalCards: fsrsMembers.length, dueCount }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .slice(0, 4)
  }, [entries])

  // ---------------------------------------------------------------------------
  // Heatmap grid (6 months = 26 weeks)
  // ---------------------------------------------------------------------------
  const heatmapGrid = useMemo(() => {
    const grid: { dateStr: string; dayOfWeek: number; count: number }[][] = []
    const today = new Date()
    const startDate = new Date()
    startDate.setDate(today.getDate() - 182)
    const startDay = startDate.getDay()
    startDate.setDate(startDate.getDate() - startDay)

    const heatmapMap = new Map(stats.heatmap.map((h) => [h.date, h.count]))
    const currentDate = new Date(startDate.getTime())

    for (let w = 0; w < 26; w++) {
      const week: { dateStr: string; dayOfWeek: number; count: number }[] = []
      for (let d = 0; d < 7; d++) {
        const year = currentDate.getFullYear()
        const month = String(currentDate.getMonth() + 1).padStart(2, '0')
        const day = String(currentDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        week.push({ dateStr, dayOfWeek: d, count: heatmapMap.get(dateStr) ?? 0 })
        currentDate.setDate(currentDate.getDate() + 1)
      }
      grid.push(week)
    }
    return grid
  }, [stats.heatmap])

  const formattedDate = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    return new Date().toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', options)
  }, [locale])

  const totalDue = getDueReviewCount(entries, new Date())

  // ---------------------------------------------------------------------------
  // Progress ring: how much of TODAY'S actual due queue has been cleared?
  //
  // totalAtStartOfDay ≈ todayReviews + totalDue (remaining)
  // This is meaningful regardless of what the user's personal "goal" is.
  // ---------------------------------------------------------------------------
  const totalAtStart = stats.todayReviews + totalDue
  const clearancePercent = totalAtStart > 0
    ? Math.min(100, Math.round((stats.todayReviews / totalAtStart) * 100))
    : 100

  // Separate: how far toward the user's personal daily goal?
  const goalPercent = stats.dailyGoal > 0
    ? Math.min(100, Math.round((stats.todayReviews / stats.dailyGoal) * 100))
    : 0

  return (
    <div className="p-8 min-h-screen max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{formattedDate}</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">
            {translate(locale, 'home.subtitle')}
          </p>
        </div>

        {/* Daily Goal Badge — click the number to edit */}
        <div className="px-4 py-2 bg-card border border-border shadow-sm rounded-2xl flex items-center gap-2 w-fit shrink-0 group">
          <CalendarBlank size={18} className="text-[var(--accent-blue)]" />
          <span className="text-xs font-bold text-foreground">
            {translate(locale, 'home.daily_goal')}:
          </span>
          {editingGoal ? (
            <input
              ref={goalInputRef}
              type="number"
              min={1}
              max={500}
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              onBlur={commitGoal}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitGoal()
                if (e.key === 'Escape') setEditingGoal(false)
              }}
              className="w-12 text-xs font-black text-center bg-muted rounded px-1 py-0.5 border border-[var(--accent-blue)] focus:outline-none"
              aria-label="Edit daily goal"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={startEditGoal}
              title="Click to edit daily goal"
              className="flex items-center gap-1 text-xs font-black text-foreground hover:text-[var(--accent-blue)] transition-colors"
            >
              {stats.dailyGoal}
              <PencilSimple size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
          )}
          <span className="text-xs text-muted-foreground font-semibold">
            {translate(locale, 'home.daily_goal_reviews', { n: '' }).replace(/\d+\s*/, '')}
          </span>
          {goalPercent >= 100 && (
            <CheckCircle size={14} className="text-[var(--accent-green)]" weight="fill" />
          )}
        </div>
      </div>

      {/* ── Bento Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Bento 1: Welcome & CTA (col-span-2) */}
        <div
          className={cn(
            'md:col-span-2 p-8 rounded-[32px] relative overflow-hidden flex flex-col justify-between min-h-[220px] shadow-sm border group bg-card transition-all duration-300',
            totalDue > 0
              ? 'bg-[var(--accent-blue-light)]/10 border-[var(--accent-blue)]/15'
              : 'bg-[var(--accent-green-light)]/10 border-[var(--accent-green)]/15',
          )}
        >
          {/* Subtle background glow */}
          <div
            className={cn(
              'absolute -right-12 -top-12 w-56 h-56 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700 opacity-10',
              totalDue > 0 ? 'bg-[var(--accent-blue)]' : 'bg-[var(--accent-green)]',
            )}
          />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={cn(
                  'text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border',
                  totalDue > 0
                    ? 'bg-[var(--accent-blue-light)] border-[var(--accent-blue)]/20 text-[var(--accent-blue)]'
                    : 'bg-[var(--accent-green-light)] border-[var(--accent-green)]/20 text-[var(--accent-green)]',
                )}
              >
                {totalDue > 0 ? translate(locale, 'home.due_today_badge') : translate(locale, 'home.caught_up_badge')}
              </span>
            </div>

            <h2 className="text-3xl font-black mb-2 tracking-tight text-foreground">
              {totalDue > 0
                ? translate(locale, 'home.due_cards', { n: totalDue })
                : translate(locale, 'home.all_caught_up')}
            </h2>
            <p className="text-muted-foreground text-sm font-medium max-w-md leading-relaxed">
              {totalDue > 0
                ? translate(locale, 'home.streak_advice')
                : translate(locale, 'home.all_reviewed_advice')}
            </p>
          </div>

          <div className="relative mt-6 flex justify-end">
            {totalDue > 0 ? (
              <Button
                type="button"
                onClick={onStartReview}
                className="px-6 py-3 font-bold rounded-2xl text-sm transition-all duration-200 flex items-center gap-2 shadow-sm text-white bg-[var(--accent-blue)] hover:opacity-90 active:scale-95 h-auto"
              >
                <Play size={16} weight="fill" />
                {translate(locale, 'home.start_review')}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => onNavigate({ kind: 'filter', filter: 'decks' })}
                className="px-6 py-3 font-bold rounded-2xl text-sm transition-all duration-200 flex items-center gap-2 shadow-sm bg-[var(--accent-green-light)] border border-[var(--accent-green)]/20 text-[var(--accent-green)] hover:bg-[var(--accent-green-light)]/20 active:scale-95 h-auto"
              >
                <Play size={16} />
                {translate(locale, 'home.view_decks')}
              </Button>
            )}
          </div>
        </div>

        {/* Bento 2: Progress Ring & Level */}
        <div className="p-6 rounded-[32px] bg-card border border-border shadow-sm flex flex-col items-center justify-center text-center relative transition-all duration-300">
          {/* Progress ring — shows actual clearance (not vs fixed goal) */}
          <div className="relative w-28 h-28 mb-3">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              {/* Track */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                className="text-muted/20"
              />
              {/* Clearance arc (actual progress) */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="url(#progressGrad)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - clearancePercent / 100)}`}
                className="transition-all duration-500"
              />
              <defs>
                <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--accent-blue)" />
                  <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {totalAtStart > 0 ? (
                <>
                  <span className="text-xl font-black text-foreground tracking-tighter leading-none">
                    {stats.todayReviews}
                    <span className="text-sm font-bold text-muted-foreground">/{totalAtStart}</span>
                  </span>
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                    {translate(locale, 'home.goal_label')}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-black text-[var(--accent-green)] tracking-tighter leading-none">✓</span>
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                    Done
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="w-full px-4 mt-2">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Trophy size={14} className="text-[var(--accent-yellow)]" weight="fill" />
              <span className="px-2 py-0.5 rounded-full bg-[var(--accent-blue-light)] text-[var(--accent-blue)] text-[10px] font-black uppercase tracking-wider">
                {translate(locale, 'home.level')} {level}
              </span>
            </div>
            {/* XP progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2 mb-1">
              <div
                className="h-full bg-[var(--accent-blue)] rounded-full transition-all duration-500"
                style={{ width: `${Math.min((currentLevelXP / nextLevelXP) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold">
              {translate(locale, 'home.xp_to_level', { current: currentLevelXP, next: nextLevelXP, level: level + 1 })}
            </p>
            {/* Goal progress hint */}
            {stats.dailyGoal > 0 && (
              <p className="text-[10px] text-muted-foreground mt-2">
                Goal: {stats.todayReviews}/{stats.dailyGoal} reviews
                {goalPercent >= 100 && <span className="ml-1 text-[var(--accent-green)] font-bold">✓</span>}
              </p>
            )}
          </div>
        </div>

        {/* Bento 3: Quick Stats */}
        <div className="col-span-1 md:col-span-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Reviewed */}
            <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-blue-light)] flex items-center justify-center text-[var(--accent-blue)]">
                <Brain size={20} weight="fill" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  {translate(locale, 'home.reviewed')}
                </p>
                <p className="text-xl font-black text-foreground tracking-tight">
                  {stats.todayReviews}
                </p>
              </div>
            </div>

            {/* Accuracy */}
            <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-blue-light)] flex items-center justify-center text-[var(--accent-blue)]">
                <CheckCircle size={20} weight="fill" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  {translate(locale, 'home.accuracy')}
                </p>
                <p className="text-xl font-black text-foreground tracking-tight">
                  {stats.todayReviews > 0
                    ? `${Math.round((stats.todayCorrect / stats.todayReviews) * 100)}%`
                    : '0%'}
                </p>
              </div>
            </div>

            {/* Study Time */}
            <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-yellow-light)] flex items-center justify-center text-[var(--accent-yellow)]">
                <Timer size={20} weight="fill" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  {translate(locale, 'home.study_time')}
                </p>
                <p className="text-xl font-black text-foreground tracking-tight">
                  {formatStudyTime(stats.todayDurationMs)}
                </p>
              </div>
            </div>

            {/* XP Earned */}
            <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-green-light)] flex items-center justify-center text-[var(--accent-green)]">
                <Sparkle size={20} weight="fill" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  {translate(locale, 'home.xp_earned')}
                </p>
                <p className="text-xl font-black text-foreground tracking-tight">
                  +{stats.todayXp} XP
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bento 4: Heatmap & Streak */}
        <div className="col-span-1 md:col-span-3 p-6 bg-card border border-border rounded-[32px] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase text-foreground tracking-wider">
                {translate(locale, 'home.heatmap')}
              </h2>
              <p className="text-xs text-muted-foreground font-semibold">
                {translate(locale, 'home.heatmap_desc')}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-yellow-light)] rounded-2xl border border-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] font-bold">
              <FireSimple size={18} weight="fill" className="animate-pulse" />
              <span className="text-xs">{translate(locale, 'home.day_streak', { n: stats.streak })}</span>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="w-full overflow-x-auto py-2">
            <div className="flex flex-col gap-1 min-w-[500px]">
              <div className="flex gap-1 justify-between text-[9px] text-muted-foreground px-1 mb-1">
                <span>{translate(locale, 'home.heatmap_ago')}</span>
                <span>{translate(locale, 'home.heatmap_today')}</span>
              </div>
              <div className="flex gap-1 select-none">
                {heatmapGrid.map((week, wIndex) => (
                  <div key={wIndex} className="flex flex-col gap-1">
                    {week.map((day, dIndex) => {
                      const count = day.count
                      return (
                        <div
                          key={dIndex}
                          title={translate(locale, 'home.heatmap_tooltip', { date: day.dateStr, n: count })}
                          className={cn(
                            'w-3.5 h-3.5 rounded-sm transition-colors duration-200',
                            count === 0
                              ? 'bg-muted/30'
                              : count < 5
                                ? 'bg-[var(--accent-blue)]/20'
                                : count < 15
                                  ? 'bg-[var(--accent-blue)]/50'
                                  : 'bg-[var(--accent-blue)]',
                          )}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bento 5: Continue Learning (Decks list) */}
        {decksData.length > 0 && (
          <div className="col-span-1 md:col-span-3 space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {translate(locale, 'home.continue_learning')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {decksData.map((deck) => (
                <div
                  key={deck.entry.path}
                  onClick={() => onNavigate({ kind: 'filter', filter: 'decks' })}
                  className="p-5 bg-card hover:bg-muted/20 border border-border rounded-[24px] cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-bold text-foreground truncate group-hover:text-[var(--accent-blue)] transition-colors">
                        {deck.entry.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                        {translate(locale, 'decks.cards_count', { n: deck.totalCards })}
                      </p>
                    </div>
                    {deck.dueCount > 0 ? (
                      <span className="px-3 py-1 bg-[var(--accent-blue-light)] text-[var(--accent-blue)] text-[10px] font-black rounded-full whitespace-nowrap">
                        {translate(locale, 'decks.due', { n: deck.dueCount })}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-[var(--accent-green-light)] text-[var(--accent-green)] text-[10px] font-black rounded-full whitespace-nowrap">
                        ✓ Done
                      </span>
                    )}
                  </div>

                  {/* Mini progress bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-blue)] rounded-full"
                      style={{
                        width: `${Math.round(((deck.totalCards - deck.dueCount) / deck.totalCards) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
