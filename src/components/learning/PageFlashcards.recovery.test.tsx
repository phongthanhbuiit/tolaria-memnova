import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
async function edit() {
  render(<PageFlashcards path="/current/lesson.md" locale="en" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Vocab question', exact: true }))
  return within(screen.getByRole('dialog'))
}
it('can save edits after a successful write followed by a failed refresh', async () => {
 let revision = 2
 workspace.client.updateCard.mockImplementation(async (_id, expected) => {
   if(expected !== revision) throw new Error('Card changed in another window; reload before saving')
   revision++
   return {...workspace.cards[0], revision}
 })
 workspace.refresh.mockRejectedValueOnce(new Error('Refresh failed')).mockResolvedValue(undefined)
 const dialog = await edit()
 fireEvent.click(dialog.getByRole('button', {name:'Save',exact:true}))
 await waitFor(() => expect(dialog.getByRole('alert')).toHaveTextContent('Refresh failed'))
 fireEvent.change(dialog.getByLabelText('Vocabulary level'), {target:{value:'C1'}})
 fireEvent.click(dialog.getByRole('button', {name:'Save',exact:true}))
 await waitFor(() => expect(workspace.client.updateCard).toHaveBeenCalledTimes(2))
 await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})
it('retries a failed refresh without repeating an already committed card update', async () => {
 workspace.client.updateCard.mockResolvedValue({...workspace.cards[0],revision:3})
 workspace.refresh.mockRejectedValueOnce(new Error('Refresh failed')).mockResolvedValue(undefined)
 const dialog=await edit()
 fireEvent.click(dialog.getByRole('button',{name:'Save',exact:true}))
 await dialog.findByText('Saved, but the list could not refresh. Retry to refresh it.')
 fireEvent.click(dialog.getByRole('button',{name:'Retry',exact:true}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
 expect(workspace.client.updateCard).toHaveBeenCalledTimes(1)
})
it('preserves a private card answer when toggling whole-page mode on and off', async () => {
 const dialog=await edit()
 const toggle=dialog.getByRole('combobox',{name:'Answer type'})
 fireEvent.click(toggle)
 fireEvent.click(screen.getByRole('option',{name:'Use current page'}))
 expect(dialog.queryByRole('textbox',{name:'Answer',exact:true})).not.toBeInTheDocument()
 fireEvent.click(toggle)
 fireEvent.click(screen.getByRole('option',{name:'Write an answer'}))
 expect(dialog.getByRole('textbox',{name:'Answer',exact:true})).toHaveValue('Vocab answer')
 expect(dialog.getByRole('combobox',{name:'Status',exact:true})).toHaveTextContent('Active')
})
