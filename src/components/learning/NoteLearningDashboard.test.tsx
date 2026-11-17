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
  fireEvent.click(screen.getByRole('button', { name: 'Study due notes (1)' }))
  expect(workspace.requestStudy).toHaveBeenCalledWith(['a', 'b'], 'notes')
  expect(screen.getByRole('tablist', { name: 'Library' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: /Note memory/ })).toHaveAttribute('aria-selected', 'true')
  fireEvent.mouseDown(screen.getByRole('tab', { name: /Old cards/ }), { button: 0, ctrlKey: false })
  expect(screen.getByRole('tabpanel', { name: /Old cards/ })).toHaveTextContent('Old dashboard')
  expect(screen.queryByRole('button', { name: /Study due notes/ })).not.toBeInTheDocument()
  fireEvent.mouseDown(screen.getByRole('tab', { name: /Note memory/ }), { button: 0, ctrlKey: false })
  expect(screen.getByRole('tabpanel', { name: /Note memory/ })).toBeInTheDocument()
})
it('discloses conversion and recovery above the notes', () => {
  render(
    <NoteLearningDashboard
      mode="decks"
      locale="en"
      onOpenPage={vi.fn()}
      legacy={null}
    />
  )
  const advanced = screen.getByRole('button', { name: 'Advanced' })
  expect(advanced).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('button', { name: 'Convert note memory' })).not.toBeInTheDocument()
  const list = screen.getByRole('list')
  expect(advanced.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(advanced)
  expect(advanced).toHaveAttribute('aria-expanded', 'true')
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

it('distinguishes future reviews from due notes and shows paths for matching titles', () => {
  const original = workspace.notes
  const future = { ...original[0], view: { ...original[0].view, pageId: 'b', path: 'Other/b.md' }, card: { ...original[0].card, pageId: 'b', schedule: { due: '2099-01-01T00:00:00Z' } } }
  workspace.notes = [...original, future]
  try {
    render(<NoteLearningDashboard mode="decks" locale="en" onOpenPage={vi.fn()} legacy={null} />)
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
    expect(screen.getByText('Due', { selector: '.note-memory-status' })).toBeInTheDocument()
    expect(screen.getByText('Biology/a.md')).toBeInTheDocument()
    expect(screen.getByText('Other/b.md')).toBeInTheDocument()
  } finally { workspace.notes = original }
})
it('explains a folder with enabled notes but no due reviews', () => {
  const original = workspace.notes
  workspace.notes = [{ ...original[0], card: { ...original[0].card, schedule: { due: '2099-01-01T00:00:00Z' } } }]
  try {
    render(<NoteLearningDashboard mode="decks" locale="en" onOpenPage={vi.fn()} legacy={null} />)
    expect(screen.getByRole('button', { name: 'Study due notes (0)', exact: true })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('No notes are due in this folder.')
  } finally { workspace.notes = original }
})

it('finds learning notes by title or relative path and limits study to matching notes', () => {
  const original = workspace.notes
  workspace.notes = [...original, {
    view: { ...original[0].view, pageId: 'b', path: 'Other/b.md' },
    card: { ...original[0].card, pageId: 'b' },
  }]
  try {
    const openPage = vi.fn()
    render(<NoteLearningDashboard mode="home" locale="en" onOpenPage={openPage} legacy={null} />)
    const search = screen.getByRole('searchbox', { name: 'Search notes' })
    const study = screen.getByRole('button', { name: /^Study/ })
    fireEvent.change(search, { target: { value: '  ARTICLE ' } })
    expect(screen.queryByRole('button', { name: 'Another note' })).not.toBeInTheDocument()
    fireEvent.click(study)
    expect(workspace.requestStudy).toHaveBeenLastCalledWith(['a'], 'notes')
    fireEvent.change(search, { target: { value: 'other/B.MD' } })
    fireEvent.click(screen.getByRole('button', { name: 'Another note' }))
    expect(openPage).toHaveBeenCalledWith(workspace.pages[1])
    fireEvent.change(search, { target: { value: 'missing' } })
    expect(study).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('No matching notes')
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(search).toHaveFocus()
    expect(screen.getByRole('button', { name: 'A4 article' })).toBeInTheDocument()
  } finally { workspace.notes = original }
})

it('shows only due rows on demand while retaining scheduled matches in the resumable study scope', () => {
  const original = workspace.notes
  workspace.notes = [...original, {
    view: { ...original[0].view, pageId: 'b', path: 'Other/b.md' },
    card: { ...original[0].card, pageId: 'b', schedule: { due: '2099-01-01T00:00:00Z' } },
  }]
  try {
    render(<NoteLearningDashboard mode="decks" locale="en" onOpenPage={vi.fn()} legacy={null} />)
    fireEvent.click(screen.getByRole('switch', { name: 'Due' }))
    expect(screen.queryByRole('button', { name: 'Another note' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Study/ }))
    expect(workspace.requestStudy).toHaveBeenLastCalledWith(['a', 'b'], 'notes')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Other' } })
    expect(screen.getByRole('button', { name: /^Study/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('switch', { name: 'Due' }))
    expect(screen.getByRole('button', { name: 'Another note' })).toBeInTheDocument()
  } finally { workspace.notes = original }
})

it('keeps the learning filters out of an ordinary writing-only Library', () => {
  const original = workspace.notes
  workspace.notes = []
  try {
    render(<NoteLearningDashboard mode="home" locale="en" onOpenPage={vi.fn()} legacy={null} />)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.getByText('Open a note and enable memorization to add it here.')).toBeVisible()
  } finally { workspace.notes = original }
})


it.each([false, true])('excludes retired records from catalog, search, count and study scope (available=%s)', (available) => {
  const originalNotes = workspace.notes
  const path = '.memnova/retired/retired-sentinel.md'
  workspace.pages.push({ id: 'retired', path, title: 'Retired sentinel', available })
  workspace.notes = [...originalNotes, {
    ...originalNotes[0],
    view: { ...originalNotes[0].view, pageId: 'retired', path, binding: { cardId: 'retired-card' } },
    card: { ...originalNotes[0].card, id: 'retired-card', pageId: 'retired' },
  }]
  const source = JSON.stringify({ pages: workspace.pages, notes: workspace.notes })
  try {
    render(<NoteLearningDashboard mode="decks" locale="en" onOpenPage={vi.fn()} legacy={null} />)
    expect(screen.queryByText(path)).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Study due notes (1)' }))
    expect(workspace.requestStudy).toHaveBeenLastCalledWith(['a', 'b'], 'notes')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'retired-sentinel' } })
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent('No matching notes')
    expect(JSON.stringify({ pages: workspace.pages, notes: workspace.notes })).toBe(source)
  } finally {
    workspace.pages.pop()
    workspace.notes = originalNotes
  }
})
