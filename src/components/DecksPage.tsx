/**
 * DecksPage.tsx
 *
 * Page that displays all available Flashcard Decks in the vault
 * and lets the user study them individually.
 */

import { useMemo } from 'react'
import { Brain, Books, CheckCircle, Play } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { translate } from '../lib/i18n'
import type { AppLocale } from '../lib/i18n'
import type { VaultEntry } from '../types'
import { isFSRSEnabled, collectDeckMembers, isFSRSEntryDue } from '../lib/fsrsVaultEntry'

interface DecksPageProps {
  entries: VaultEntry[]
  onStartStudyDeck: (deckRoot: VaultEntry) => void
  locale?: AppLocale
}

export function DecksPage({
  entries,
  onStartStudyDeck,
  locale = 'en',
}: DecksPageProps) {
  // Aggregate all decks from vault entries
  const decksList = useMemo(() => {
    // Find all entries that have at least one sub-card with FSRS enabled
    // or are FSRS enabled themselves.
    return entries
      .filter((deckCandidate) => {
        const members = collectDeckMembers(deckCandidate, entries)
        const fsrsMembers = members.filter((m) => isFSRSEnabled(m))
        return fsrsMembers.length > 0 || isFSRSEnabled(deckCandidate)
      })
      .map((deck) => {
        const members = collectDeckMembers(deck, entries)
        const fsrsMembers = members.filter((m) => isFSRSEnabled(m))

        // If the deck root itself is an FSRS card, include it as well
        if (isFSRSEnabled(deck)) {
          fsrsMembers.push(deck)
        }

        const totalCards = fsrsMembers.length
        const dueCards = fsrsMembers.filter((m) => isFSRSEntryDue(m)).length

        return {
          entry: deck,
          totalCards,
          dueCards,
        }
      })
      .sort((a, b) => b.dueCards - a.dueCards || b.totalCards - a.totalCards) // Sort by due first
  }, [entries])

  return (
    <div className="p-8 min-h-screen max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Brain size={28} className="text-[var(--accent-purple)]" />
          {translate(locale, 'decks.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">
          {translate(locale, 'decks.subtitle')}
        </p>
      </div>

      {decksList.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-3xl min-h-[300px]">
          <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground mb-4">
            <Books size={32} />
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            {translate(locale, 'decks.empty')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {decksList.map((deck) => {
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
                      <h3 className="font-bold text-lg text-foreground truncate group-hover:text-[var(--accent-purple)] transition-colors">
                        {deck.entry.title}
                      </h3>
                      {deck.entry.isA && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border inline-block mt-1">
                          {deck.entry.isA}
                        </span>
                      )}
                    </div>

                    {deck.dueCards > 0 ? (
                      <span className="px-3 py-1 bg-[var(--accent-purple-light)] text-[var(--accent-purple)] text-[10px] font-black rounded-full whitespace-nowrap">
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
                        className="h-full bg-[var(--accent-purple)] rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Study button */}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => onStartStudyDeck(deck.entry)}
                      className="px-4 py-2 bg-[var(--accent-purple)] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 active:scale-95 shadow-sm h-auto"
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
