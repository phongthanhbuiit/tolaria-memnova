vi.mock('../FlashcardStudyView',()=>({BlockNoteReadOnly:({content}:{content:string})=><div>{content}</div>}))
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { PageFlashcards } from './PageFlashcards'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import type { LearningCard } from '../../lib/learning/types'
import type { VaultEntry } from '../../types'
const { workspace } = vi.hoisted(() => ({ workspace: { phase: 'ready', client: { vaultPath: '/current', ensurePage: vi.fn(), updateCard: vi.fn(), readStudyPage: vi.fn() }, root: '/current', pages: [] as {id:string;path:string;title:string;available:boolean}[], cards: [] as LearningCard[], entries: [] as VaultEntry[], flush: vi.fn().mockResolvedValue(undefined), refresh: vi.fn() } }))
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
it('chooses a duplicate-title source by path and previews it without losing the card draft', async () => {
 const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222'
 workspace.entries=[makeEntry({path:'/current/source-a.md',title:'Same'}),makeEntry({path:'/current/source-b.md',title:'Same'})]
 workspace.pages=[{id:a,path:'source-a.md',title:'Same',available:true},{id:b,path:'source-b.md',title:'Same',available:true}]
 workspace.client.ensurePage.mockImplementation(async (path:string)=> path==='lesson.md'?{id:'page',path}:workspace.pages.find(page=>page.path===path))
 workspace.client.readStudyPage.mockResolvedValue({id:b,path:'source-b.md',title:'Same',content:'Source answer B',fingerprint:'source-b'})
 workspace.client.updateCard.mockImplementation(async (_id,_rev,draft)=>({...workspace.cards[0],...draft,revision:3}))
 const dialog=await edit()
 fireEvent.click(dialog.getByRole('combobox',{name:'Answer type'}))
 fireEvent.click(screen.getByRole('option',{name:'Choose another page'}))
 fireEvent.change(dialog.getByLabelText('Answer page'),{target:{value:'Same'}})
 fireEvent.click(await dialog.findByRole('button',{name:/Same.*source-b.md/}))
 await waitFor(()=>expect(workspace.client.ensurePage).toHaveBeenCalledWith('source-b.md'))
 fireEvent.change(dialog.getByLabelText('Question'),{target:{value:'Unsaved draft question'}})
 fireEvent.click(dialog.getByRole('button',{name:'Same',exact:true}))
 const preview=await screen.findByRole('dialog',{name:'Same',exact:true})
 expect(await within(preview).findByText('Source answer B')).toBeVisible()
 fireEvent.click(within(preview).getByRole('button',{name:'Close',exact:true}))
 expect(dialog.getByLabelText('Question')).toHaveValue('Unsaved draft question')
 fireEvent.click(dialog.getByRole('button',{name:'Save',exact:true}))
 await waitFor(()=>expect(workspace.client.updateCard).toHaveBeenCalledWith('card',2,expect.objectContaining({answerMode:'page',answerPageId:b,back:'Vocab answer'})))
})
