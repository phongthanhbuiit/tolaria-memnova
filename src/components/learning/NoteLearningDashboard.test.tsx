import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { NoteLearningDashboard } from './NoteLearningDashboard'

const workspace = {
  root: '/library',
  error: null as string | null,
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

it('keeps internal retained-history paths out of the folder picker', () => {
  workspace.pages.push({
    id: 'retired',
    path: '.memnova/retired/old.md',
    title: 'Retired',
    available: false,
  })
  try {
    render(
      <NoteLearningDashboard
        mode="decks"
        locale="en"
        onOpenPage={vi.fn()}
        legacy={null}
      />
    )
    fireEvent.click(screen.getByRole('combobox', { name: 'Folder' }))
    expect(
      screen.queryAllByRole('option', { name: /^\.memnova/ })
    ).toHaveLength(0)
  } finally {
    workspace.pages.pop()
  }
})

it('clears an initial refresh error when the same mounted workspace publishes a successful snapshot', async () => {
  workspace.refresh.mockRejectedValueOnce(Error('temporary-read-failure'))
  const props = { mode: 'home' as const, locale: 'en' as const, onOpenPage: vi.fn(), legacy: null }
  const view = render(<NoteLearningDashboard {...props} />)
  await act(async () => { await Promise.resolve() })
  workspace.error = 'temporary-read-failure'
  view.rerender(<NoteLearningDashboard {...props} />)
  expect(screen.getByRole('alert')).toHaveTextContent('temporary-read-failure')
  await act(async () => { await workspace.refresh() })
  workspace.error = null
  workspace.clock += 60_000
  view.rerender(<NoteLearningDashboard {...props} />)
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
})
