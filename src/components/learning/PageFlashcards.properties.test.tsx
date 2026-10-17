import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { PageFlashcards } from './PageFlashcards'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import type { LearningCard } from '../../lib/learning/types'
import type { VaultEntry } from '../../types'
const { workspace } = vi.hoisted(() => ({
  workspace: {
    phase: 'ready',
    client: { vaultPath: '/current', ensurePage: vi.fn(), updateCard: vi.fn() },
    cards: [] as LearningCard[],
    entries: [] as VaultEntry[],
    refresh: vi.fn(),
  },
}))
vi.mock('./LearningContext', () => ({ useLearningWorkspace: () => workspace }))
const properties = {
  card_type: 'vocabulary',
  part_of_speech: 'noun',
  level: 'A1',
  synonyms: '[[Old, target|alias]]',
  antonyms: '[[Old opposite]]',
  prefixes: '[[pre-]]',
  suffixes: '[[-ion]]',
  IPA: '/x/',
  audio: 'a.mp3',
  image: 'a.png',
  custom: { keep: [1, 2] },
}
beforeEach(() => {
  workspace.client.ensurePage.mockResolvedValue({
    id: 'page',
    path: 'lesson.md',
  })
  workspace.client.updateCard.mockReset()
  workspace.refresh.mockResolvedValue(undefined)
  workspace.entries = [
    makeEntry({ path: '/current/related.md', title: 'Related term' }),
  ]
  workspace.cards = [
    {
      id: 'card',
      pageId: 'page',
      front: 'Vocab question',
      back: 'Vocab answer',
      status: 'active',
      answerMode: 'inline',
      position: 0,
      revision: 2,
      createdAt: 1,
      updatedAt: 2,
      properties: structuredClone(properties),
      schedule: {
        state: 'review',
        reps: 17,
        lapses: 2,
        stability: 12,
        difficulty: 4,
        due: '2027-01-01T00:00:00Z',
        lastReview: '2026-10-01T00:00:00Z',
        elapsedDays: 2,
        scheduledDays: 9,
        learningSteps: 0,
        engine: 'legacy-fsrs5',
        revision: 8,
      },
    },
  ]
})
async function edit() {
  render(<PageFlashcards path="/current/lesson.md" locale="en" />)
  fireEvent.click(
    await screen.findByRole('button', { name: 'Vocab question', exact: true }),
  )
  return within(screen.getByRole('dialog'))
}
it('keeps custom fields in one draft and preserves memory and opaque metadata on save', async () => {
  workspace.client.updateCard.mockImplementation(async (_id, _rev, draft) => ({
    ...workspace.cards[0],
    ...draft,
    revision: 3,
  }))
  const dialog = await edit()
  fireEvent.change(
    dialog.getByRole('textbox', { name: 'Property name', exact: true }),
    { target: { value: 'priority' } },
  )
  fireEvent.click(
    dialog.getByRole('combobox', { name: 'Property type', exact: true }),
  )
  fireEvent.click(screen.getByRole('option', { name: 'Number', exact: true }))
  fireEvent.click(
    dialog.getByRole('button', { name: 'Add property', exact: true }),
  )
  expect(dialog.getByLabelText('priority')).toHaveValue('0')
  fireEvent.change(dialog.getByLabelText('priority'), { target: { value: '' } })
  expect(
    dialog.getByRole('button', { name: 'Save', exact: true }),
  ).toBeDisabled()
  fireEvent.change(dialog.getByLabelText('priority'), {
    target: { value: '4' },
  })
  fireEvent.click(dialog.getByRole('button', { name: 'Save', exact: true }))
  await waitFor(() =>
    expect(workspace.client.updateCard).toHaveBeenCalledWith(
      'card',
      2,
      expect.objectContaining({
        properties: expect.objectContaining({ ...properties, priority: 4 }),
        propertyDefinitions: { priority: { valueKind: 'number' } },
      }),
    ),
  )
  expect(workspace.cards[0].schedule.reps).toBe(17)
})
it('does not persist a custom-field draft when cancelling or switching preset', async () => {
  const dialog = await edit()
  fireEvent.change(
    dialog.getByRole('textbox', { name: 'Property name', exact: true }),
    { target: { value: 'Private draft' } },
  )
  fireEvent.click(
    dialog.getByRole('button', { name: 'Add property', exact: true }),
  )
  fireEvent.click(
    dialog.getByRole('combobox', { name: 'Card type', exact: true }),
  )
  fireEvent.click(screen.getByRole('option', { name: 'Basic', exact: true }))
  expect(dialog.getByLabelText('Private draft')).toHaveValue('')
  fireEvent.click(dialog.getByRole('button', { name: 'Cancel', exact: true }))
  expect(workspace.client.updateCard).not.toHaveBeenCalled()
  expect(workspace.cards[0].properties).toEqual(properties)
})
