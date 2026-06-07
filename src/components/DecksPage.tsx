/**
 * DecksPage.tsx
 *
 * Page that displays all available Flashcard Decks in the vault
 * and lets the user study them individually.
 *
 * Features:
 *  - Search bar filters decks by title in real time
 *  - Filter tabs: All / Due / Up to date
 *  - Summary line shows total due today
 */

import { useMemo, useState } from 'react'
import { Brain, Books, CheckCircle, MagnifyingGlass, Play, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { translate } from '../lib/i18n'
import type { AppLocale } from '../lib/i18n'
import type { VaultEntry } from '../types'
import { isFSRSEnabled, collectDeckMembers, isFSRSEntryDue } from '../lib/fsrsVaultEntry'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DecksPageProps {
  entries: VaultEntry[]
  onStartStudyDeck: (deckRoot: VaultEntry) => void
  locale?: AppLocale
}

type StatusFilter = 'all' | 'due' | 'done'

// ---------------------------------------------------------------------------
// Filter tab button
// ---------------------------------------------------------------------------

function FilterTab({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean
  count: number
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150',
        active
          ? 'bg-[var(--accent-blue)] text-white shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      {label}
      <span
        className={cn(
          'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-black px-1',
          active ? 'bg-white/25' : 'bg-muted text-muted-foreground',
        )}
      >
        {count}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DecksPage({
  entries,
  onStartStudyDeck,
  locale = 'en',
}: DecksPageProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // ---------------------------------------------------------------------------
  // Build aggregated deck list (expensive, memoized)
  // ---------------------------------------------------------------------------
  const decksList = useMemo(() => {
    return entries
      .filter((deckCandidate) => {
        const members = collectDeckMembers(deckCandidate, entries)
        const fsrsMembers = members.filter((m) => isFSRSEnabled(m))
        return fsrsMembers.length > 0 || isFSRSEnabled(deckCandidate)
      })
      .map((deck) => {
        const members = collectDeckMembers(deck, entries)
        const fsrsMembers = members.filter((m) => isFSRSEnabled(m))

        // If the deck root itself is an FSRS card, include it
        if (isFSRSEnabled(deck)) {
          fsrsMembers.push(deck)
        }

        const totalCards = fsrsMembers.length
        const dueCards = fsrsMembers.filter((m) => isFSRSEntryDue(m)).length

        return { entry: deck, totalCards, dueCards }
      })
      .sort((a, b) => b.dueCards - a.dueCards || b.totalCards - a.totalCards)
  }, [entries])

  // ---------------------------------------------------------------------------
  // Apply search + status filter
  // ---------------------------------------------------------------------------
  const filteredDecks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return decksList.filter((deck) => {
      const matchesSearch = !query || deck.entry.title.toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === 'all'
        || (statusFilter === 'due' && deck.dueCards > 0)
        || (statusFilter === 'done' && deck.dueCards === 0)
      return matchesSearch && matchesStatus
    })
  }, [decksList, search, statusFilter])

  // ---------------------------------------------------------------------------
  // Summary counts for filter tabs
  // ---------------------------------------------------------------------------
  const counts = useMemo(() => ({
    all: decksList.length,
    due: decksList.filter((d) => d.dueCards > 0).length,
    done: decksList.filter((d) => d.dueCards === 0).length,
  }), [decksList])

  const totalDueCards = useMemo(
    () => decksList.reduce((sum, d) => sum + d.dueCards, 0),
    [decksList],
  )

  const hasDecks = decksList.length > 0
  const hasResults = filteredDecks.length > 0
  const isFiltered = search.trim() !== '' || statusFilter !== 'all'

  return (
    <div className="p-8 min-h-screen max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Brain size={28} className="text-[var(--accent-blue)]" />
            {translate(locale, 'decks.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium flex items-center gap-2">
            {translate(locale, 'decks.subtitle')}
            {totalDueCards > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--accent-blue-light)] text-[var(--accent-blue)] rounded-full text-[10px] font-black">
                {translate(locale, 'decks.total_due', { n: totalDueCards })}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── Search + Filter bar (only show when there are decks) ── */}
      {hasDecks && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search input */}
          <div className="relative flex-1 min-w-0">
            <MagnifyingGlass
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              id="decks-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={translate(locale, 'decks.search_placeholder')}
              className="pl-8 pr-8 h-8 text-[12px] bg-muted border-border focus-visible:ring-[var(--accent-blue)] focus-visible:border-[var(--accent-blue)]"
              aria-label={translate(locale, 'decks.search_placeholder')}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1 shrink-0">
            <FilterTab
              active={statusFilter === 'all'}
              count={counts.all}
              label={translate(locale, 'decks.filter.all')}
              onClick={() => setStatusFilter('all')}
            />
            <FilterTab
              active={statusFilter === 'due'}
              count={counts.due}
              label={translate(locale, 'decks.filter.due')}
              onClick={() => setStatusFilter('due')}
            />
            <FilterTab
              active={statusFilter === 'done'}
              count={counts.done}
              label={translate(locale, 'decks.filter.done')}
              onClick={() => setStatusFilter('done')}
            />
          </div>
        </div>
      )}

      {/* ── Deck grid ──────────────────────────────────────────── */}
      {!hasDecks ? (
        /* Vault has no FSRS decks at all */
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl min-h-[300px]">
          <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground mb-4">
            <Books size={32} />
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            {translate(locale, 'decks.empty')}
          </p>
        </div>
      ) : !hasResults ? (
        /* Has decks but the search/filter returned nothing */
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl min-h-[200px]">
          <MagnifyingGlass size={28} className="text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {translate(locale, 'decks.empty_search')}
          </p>
          {isFiltered && (
            <button
              type="button"
              onClick={() => { setSearch(''); setStatusFilter('all') }}
              className="mt-3 text-[12px] text-[var(--accent-blue)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDecks.map((deck) => {
            const progress = deck.totalCards > 0
              ? Math.round(((deck.totalCards - deck.dueCards) / deck.totalCards) * 100)
              : 0

            return (
              <div
                key={deck.entry.path}
                className="p-6 bg-card border border-border rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[160px] group"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg text-foreground truncate group-hover:text-[var(--accent-blue)] transition-colors">
                        {deck.entry.title}
                      </h3>
                      {deck.entry.isA && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border inline-block mt-1">
                          {deck.entry.isA}
                        </span>
                      )}
                    </div>

                    {deck.dueCards > 0 ? (
                      <span className="px-3 py-1 bg-[var(--accent-blue-light)] text-[var(--accent-blue)] text-[10px] font-black rounded-full whitespace-nowrap">
                        {translate(locale, 'decks.due', { n: deck.dueCards })}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-[var(--accent-green-light)] text-[var(--accent-green)] text-[10px] font-black rounded-full whitespace-nowrap flex items-center gap-1">
                        <CheckCircle size={12} weight="fill" />
                        {translate(locale, 'decks.done_all')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground font-semibold mb-4">
                    {translate(locale, 'decks.cards_count', { n: deck.totalCards })}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                      <span>{translate(locale, 'decks.progress')}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-blue)] rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Study button */}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => onStartStudyDeck(deck.entry)}
                      className="px-4 py-2 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 active:scale-95 shadow-sm h-auto"
                    >
                      <Play size={12} weight="fill" />
                      {translate(locale, 'decks.study_deck')}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
