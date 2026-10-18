import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { LinkedNoteBackPreview, NoteBackSourceToolbar } from './NoteBackSource'
import { makeEntry } from '../../test-utils/noteListTestUtils'

const { state } = vi.hoisted(() => ({
  state: { workspace: {} as Record<string, unknown> },
}))
vi.mock('./LearningContext', () => ({
  useLearningWorkspace: () => state.workspace,
}))
vi.mock('../BlockNoteReadOnly', () => ({
  BlockNoteReadOnly: ({ content }: { content: string }) => <div>{content}</div>,
}))
const back = { kind: 'page' as const, pageId: 'source', face: 'front' as const }
it('shows only the linked face and removes stale content when the source becomes unavailable', async () => {
  const readNoteFace = vi
    .fn()
    .mockResolvedValueOnce({
      pageId: 'source',
      path: 'source.md',
      face: 'front',
      content: 'Actual source article',
      fingerprint: 'snapshot',
      media: [],
    })
    .mockRejectedValue(Error('missing-page'))
  state.workspace = {
    root: '/library',
    phase: 'ready',
    client: { vaultPath: '/library', readNoteFace },
    clock: 1,
  }
  const { rerender } = render(
    <LinkedNoteBackPreview back={back} ownerPageId="owner" locale="en" />
  )
  await screen.findByText('Actual source article')
  state.workspace = { ...state.workspace, clock: 2 }
  rerender(
    <LinkedNoteBackPreview back={back} ownerPageId="owner" locale="en" />
  )
  await screen.findByText('Error: missing-page')
  expect(screen.queryByText('Actual source article')).not.toBeInTheDocument()
  expect(readNoteFace).toHaveBeenCalledTimes(2)
})
it('blocks opening a source if the outgoing owner cannot be saved', async () => {
  const flush = vi.fn().mockRejectedValue(Error('Disk full')),
    navigate = vi.fn(),
    apply = vi.fn()
  state.workspace = {
    root: '/library',
    phase: 'ready',
    client: { vaultPath: '/library' },
    pages: [
      { id: 'source', path: 'source.md', title: 'Source', available: true },
    ],
    entries: [makeEntry({ path: '/library/source.md', title: 'Source' })],
    flush,
  }
  render(
    <NoteBackSourceToolbar
      back={back}
      ownerPath="/library/owner.md"
      ownerPageId="owner"
      locale="en"
      onApplyBack={apply}
      onNavigate={navigate}
    />
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Open source', exact: true })
  )
  await waitFor(() => expect(flush).toHaveBeenCalledOnce())
  await screen.findByText('Error: Disk full')
  expect(navigate).not.toHaveBeenCalled()
  expect(apply).not.toHaveBeenCalled()
})
it('returns to the retained local mnemonic without mutating the source page', async () => {
  const apply = vi.fn(async () => {}),
    flush = vi.fn(async () => {}),
    ensurePage = vi.fn()
  state.workspace = {
    root: '/library',
    phase: 'ready',
    client: { vaultPath: '/library', ensurePage },
    pages: [
      { id: 'source', path: 'source.md', title: 'Source', available: true },
    ],
    entries: [],
    flush,
  }
  render(
    <NoteBackSourceToolbar
      back={back}
      ownerPath="/library/owner.md"
      ownerPageId="owner"
      locale="en"
      onApplyBack={apply}
      onNavigate={vi.fn()}
    />
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Use local mnemonic', exact: true })
  )
  await waitFor(() => expect(apply).toHaveBeenCalledWith({ kind: 'inline' }))
  expect(ensurePage).not.toHaveBeenCalled()
})
