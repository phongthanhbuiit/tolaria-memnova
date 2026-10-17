import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { PageFlashcards } from './PageFlashcards'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import type { LearningCard } from '../../lib/learning/types'
import type { VaultEntry } from '../../types'
const { workspace } = vi.hoisted(() => ({ workspace: { phase: 'ready', client: { vaultPath: '/current', ensurePage: vi.fn(), updateCard: vi.fn() }, cards: [] as LearningCard[], entries: [] as VaultEntry[], refresh: vi.fn() } }))
vi.mock('./LearningContext', () => ({ useLearningWorkspace: () => workspace }))
const properties = { card_type: 'vocabulary', part_of_speech: 'noun', level: 'A1', synonyms: '[[Old, target|alias]]', antonyms: '[[Old opposite]]', prefixes: '[[pre-]]', suffixes: '[[-ion]]', IPA: '/x/', audio: 'a.mp3', image: 'a.png', custom: { keep: [1, 2] } }
beforeEach(() => {
  workspace.client.ensurePage.mockResolvedValue({ id: 'page', path: 'lesson.md' }); workspace.client.updateCard.mockReset(); workspace.refresh.mockResolvedValue(undefined)
  workspace.entries = [makeEntry({ path: '/current/related.md', title: 'Related term' })]
  workspace.cards = [{ id: 'card', pageId: 'page', front: 'Vocab question', back: 'Vocab answer', status: 'active', answerMode: 'inline', position: 0, revision: 2, createdAt: 1, updatedAt: 2, properties: structuredClone(properties), schedule: { state: 'review', reps: 17, lapses: 2, stability: 12, difficulty: 4, due: '2027-01-01T00:00:00Z', lastReview: '2026-10-01T00:00:00Z', elapsedDays: 2, scheduledDays: 9, learningSteps: 0, engine: 'legacy-fsrs5', revision: 8 } }]
})
it('review: trashed cards cannot leave trash through suspension', async () => {
 workspace.cards[0].status='trashed'
 render(<PageFlashcards path="/current/lesson.md" locale="en" />)
 await waitFor(()=>expect(screen.getByRole('button',{name:'Add card'})).toBeEnabled())
 fireEvent.click(screen.getByRole('combobox',{name:'Flashcards',exact:true}))
 fireEvent.click(screen.getByRole('option',{name:'Trash',exact:true}))
 expect(screen.getByRole('button',{name:'Restore',exact:true})).toBeVisible()
 expect(screen.queryByRole('button',{name:'Suspended',exact:true})).not.toBeInTheDocument()
})
