import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { NoteLearningDashboard } from './NoteLearningDashboard'

const workspace = {
  root: '/library',
  clock: Date.now(),
  client: {},
  pages: [
    { id: 'a', path: 'Biology/a.md', title: 'A4 article', available: true },
    { id: 'b', path: 'Other/b.md', title: 'Another note', available: true },
  ],
  notes: [
    {
      view: {
        pageId: 'a',
        path: 'Biology/a.md',
        state: 'ready',
        config: { enabled: true },
        binding: { cardId: 'note-a' },
      },
      card: {
        id: 'note-a',
        pageId: 'a',
        status: 'active',
        schedule: { due: new Date(0).toISOString() },
      },
    },
  ],
  cards: [
    {
      id: 'old',
      pageId: 'b',
      status: 'active',
      schedule: { due: new Date(0).toISOString() },
    },
  ],
  requestStudy: vi.fn(),
  flush: vi.fn(),
  refresh: vi.fn().mockResolvedValue(undefined),
  stats: null,
}
vi.mock('./LearningContext', () => ({ useLearningWorkspace: () => workspace }))
vi.mock('./NoteConversionDialog', () => ({
  NoteConversionDialog: ({ open }: { open: boolean }) =>
    open ? <p>Conversion opened</p> : null,
}))
vi.mock('./NoteRecoveryDialog', () => ({
  NoteRecoveryDialog: ({ open }: { open: boolean }) =>
    open ? <p>Recovery opened</p> : null,
}))
vi.mock('./BackupPanel', () => ({ BackupPanel: () => null }))

it('defaults to note learning, exposes old cards explicitly and never mixes the lanes', () => {
  render(
    <NoteLearningDashboard
      mode="home"
      locale="en"
      onOpenPage={vi.fn()}
      legacy={<p>Old dashboard</p>}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Study' }))
  expect(workspace.requestStudy).toHaveBeenCalledWith(['a', 'b'], 'notes')
  fireEvent.click(screen.getByRole('button', { name: /Old cards/ }))
  expect(screen.getByText('Old dashboard')).toBeInTheDocument()
})
it('connects conversion and recovery entries instead of leaving dialogs unreachable', () => {
  render(
    <NoteLearningDashboard
      mode="decks"
      locale="en"
      onOpenPage={vi.fn()}
      legacy={null}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Convert note memory' }))
  expect(screen.getByText('Conversion opened')).toBeInTheDocument()
  fireEvent.click(
    screen.getByRole('button', { name: 'Saved drafts and recovery' })
  )
  expect(screen.getByText('Recovery opened')).toBeInTheDocument()
})
