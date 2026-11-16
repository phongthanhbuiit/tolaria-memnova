import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { NoteMemorySwitch } from './NoteMemorySwitch'
import { NoteLearningPanel } from './NoteLearningPanel'

const workspace = {
  phase: 'ready',
  clock: 1,
  error: null as string | null,
  root: '/library',
  client: { supportsNoteMemory: true, vaultPath: '/library', libraryId: 'library', ensurePage: vi.fn() },
  pages: [] as { id: string; path: string }[],
  notes: [] as unknown[],
  cards: [] as { id: string; pageId: string }[],
  setNoteEnabled: vi.fn().mockResolvedValue(undefined),
  requestStudy: vi.fn(),
  flush: vi.fn(),
  refresh: vi.fn().mockResolvedValue(undefined),
}
vi.mock('./LearningContext', () => ({ useLearningWorkspace: () => workspace }))
vi.mock('./LegacyPageFlashcards', () => ({
  LegacyPageFlashcards: () => <p>Retained old cards</p>,
}))

it('keeps opening an ordinary note read-only until explicit enable', async () => {
  workspace.pages = []
  workspace.notes = []
  workspace.cards = []
  render(<><NoteMemorySwitch path="/library/a.md" locale="en" /><NoteLearningPanel path="/library/a.md" locale="en" /></>)
  expect(workspace.client.ensurePage).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('switch', { name: 'Spaced repetition' }))
  await waitFor(() =>
    expect(workspace.setNoteEnabled).toHaveBeenCalledWith('/library/a.md', true)
  )
  expect(screen.queryByRole('button', { name: 'Add card' })).toBeNull()
})
it('pauses an enabled note explicitly and offers only the selected note for study', async () => {
  workspace.pages = [{ id: 'a', path: 'a.md' }]
  workspace.notes = [
    {
      view: {
        path: 'a.md', pageId: 'a',
        state: 'ready',
        config: { enabled: true },
        diagnostics: [],
        pendingOperations: [],
      },
    },
  ]
  render(<><NoteMemorySwitch path="/library/a.md" locale="en" /><NoteLearningPanel path="/library/a.md" locale="en" /></>)
  fireEvent.click(screen.getByRole('button', { name: 'Review this note' }))
  expect(workspace.requestStudy).toHaveBeenCalledWith(['a'], 'notes')
  fireEvent.click(screen.getByRole('switch', { name: 'Spaced repetition' }))
  await waitFor(() =>
    expect(workspace.setNoteEnabled).toHaveBeenCalledWith(
      '/library/a.md',
      false
    )
  )
})
it('keeps existing old-card editing behind an explicit entry', () => {
  workspace.pages = [{ id: 'a', path: 'a.md' }]
  workspace.notes = []
  workspace.cards = [{ id: 'legacy', pageId: 'a' }]
  render(<NoteLearningPanel path="/library/a.md" locale="en" />)
  fireEvent.click(screen.getByRole('button', { name: /Old cards/ }))
  expect(screen.getByText('Retained old cards')).toBeInTheDocument()
})

beforeEach(() => {
  workspace.requestStudy.mockClear()
  workspace.pages = []; workspace.notes = []; workspace.cards = []
  workspace.error = null
  workspace.setNoteEnabled.mockReset().mockResolvedValue(undefined)
})
it('offers a draft mnemonic action without enabling or grading any source', async () => {
  workspace.pages = [{ id: 'a', path: 'a.md' }]
  workspace.notes = [{ view: { path: 'a.md', pageId: 'a', state: 'draft', config: { enabled: true }, hasBack: false } }]
  const edit = vi.fn().mockResolvedValue(undefined)
  render(<NoteLearningPanel path="/library/a.md" locale="en" onEditMnemonic={edit} />)
  expect(screen.queryByRole('button', { name: 'Review this note', exact: true })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add mnemonic', exact: true }))
  await waitFor(() => expect(edit).toHaveBeenCalledOnce())
  expect(workspace.setNoteEnabled).not.toHaveBeenCalled()
  expect(workspace.requestStudy).not.toHaveBeenCalled()
})
it('labels paused notes with resume and keeps mutation errors across a successful background read', async () => {
  workspace.pages = [{ id: 'a', path: 'a.md' }]
  workspace.notes = [{ view: { path: 'a.md', pageId: 'a', state: 'disabled', config: { enabled: false }, hasBack: true } }]
  workspace.setNoteEnabled.mockRejectedValueOnce(Error('write rejected'))
  const view = render(<NoteMemorySwitch path="/library/a.md" locale="en" />)
  fireEvent.click(screen.getByRole('switch', { name: 'Spaced repetition' }))
  await screen.findByRole('alert')
  await workspace.refresh()
  workspace.clock++
  view.rerender(<NoteMemorySwitch path="/library/a.md" locale="en" />)
  expect(screen.getByRole('alert')).toHaveTextContent('write rejected')
  expect(screen.getByRole('switch')).not.toBeChecked()
  expect(screen.getByText(/review history are kept/)).toBeInTheDocument()
})

it('shows no learning actions in compact Properties for an ordinary Markdown note', () => {
  render(<NoteLearningPanel path="/library/a.md" locale="en" compact />)
  expect(screen.queryByRole('region')).toBeNull()
  expect(workspace.client.ensurePage).not.toHaveBeenCalled()
})

it('allows editing a retained mnemonic while paused without restarting learning', async () => {
  workspace.pages = [{ id: 'a', path: 'a.md' }]
  workspace.notes = [{ view: { path: 'a.md', pageId: 'a', state: 'disabled', config: { enabled: false }, hasBack: true } }]
  const edit = vi.fn().mockResolvedValue(undefined)
  render(<NoteLearningPanel path="/library/a.md" locale="en" compact onEditMnemonic={edit} />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit mnemonic', exact: true }))
  await waitFor(() => expect(edit).toHaveBeenCalledOnce())
  expect(screen.queryByRole('button', { name: 'Review this note', exact: true })).toBeNull()
  expect(workspace.setNoteEnabled).not.toHaveBeenCalled()
})

it('keeps save errors visible when Properties cannot switch the mounted editor', async () => {
  workspace.pages = [{ id: 'a', path: 'a.md' }]
  workspace.notes = [{ view: { path: 'a.md', pageId: 'a', state: 'ready', config: { enabled: true }, hasBack: true } }]
  render(<NoteLearningPanel path="/library/a.md" locale="en" compact onEditMnemonic={async () => { throw Error('Save failed') }} />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit mnemonic', exact: true }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Save failed')
  expect(workspace.setNoteEnabled).not.toHaveBeenCalled()
  expect(workspace.requestStudy).not.toHaveBeenCalled()
})
