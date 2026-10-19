import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { NoteLearningPanel } from './NoteLearningPanel'

const workspace = {
  phase: 'ready',
  clock: 1,
  error: null as string | null,
  root: '/library',
  client: { vaultPath: '/library', libraryId: 'library', ensurePage: vi.fn() },
  pages: [] as { id: string; path: string }[],
  notes: [] as unknown[],
  cards: [] as { pageId: string }[],
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
  render(<NoteLearningPanel path="/library/a.md" locale="en" />)
  expect(workspace.client.ensurePage).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Enable memorization' }))
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
        pageId: 'a',
        state: 'ready',
        config: { enabled: true },
        diagnostics: [],
        pendingOperations: [],
      },
    },
  ]
  render(<NoteLearningPanel path="/library/a.md" locale="en" />)
  fireEvent.click(screen.getByRole('button', { name: 'Study' }))
  expect(workspace.requestStudy).toHaveBeenCalledWith(['a'], 'notes')
  fireEvent.click(screen.getByRole('button', { name: 'Pause memorization' }))
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
  workspace.cards = [{ pageId: 'a' }]
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
  workspace.notes = [{ view: { pageId: 'a', state: 'draft', config: { enabled: true }, hasBack: false } }]
  const edit = vi.fn().mockResolvedValue(undefined)
  render(<NoteLearningPanel path="/library/a.md" locale="en" onEditMnemonic={edit} />)
  expect(screen.getByRole('button', { name: 'Study', exact: true })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Add mnemonic', exact: true }))
  await waitFor(() => expect(edit).toHaveBeenCalledOnce())
  expect(workspace.setNoteEnabled).not.toHaveBeenCalled()
  expect(workspace.requestStudy).not.toHaveBeenCalled()
})
it('labels paused notes with resume and keeps mutation errors across a successful background read', async () => {
  workspace.pages = [{ id: 'a', path: 'a.md' }]
  workspace.notes = [{ view: { pageId: 'a', state: 'disabled', config: { enabled: false }, hasBack: true } }]
  workspace.setNoteEnabled.mockRejectedValueOnce(Error('write rejected'))
  const view = render(<NoteLearningPanel path="/library/a.md" locale="en" />)
  fireEvent.click(screen.getByRole('button', { name: 'Resume', exact: true }))
  await screen.findByRole('alert')
  await workspace.refresh()
  workspace.clock++
  view.rerender(<NoteLearningPanel path="/library/a.md" locale="en" />)
  expect(screen.getByRole('alert')).toHaveTextContent('write rejected')
  expect(screen.getByText('Paused')).toBeInTheDocument()
})
