import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { NoteBackSourceDialog } from './NoteBackSourceDialog'
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
const target = '22222222-2222-4222-8222-222222222222'
function fixture() {
  let registered = false
  const previewNoteSource = vi.fn(
    async (path: string, face: 'front' | 'back') => ({
      pageId: registered ? target : null,
      path,
      face,
      content: face === 'front' ? 'Source article' : 'Source mnemonic',
      sourceHash: (registered ? 'c' : 'a').repeat(64),
      fingerprint: (face === 'front' ? 'b' : 'd').repeat(64),
      media: [],
      hasBack: true,
      backLinked: false,
    })
  )
  const ensurePage = vi.fn(async () => {
    registered = true
    return {
      id: target,
      path: 'source.md',
      title: 'Source',
      available: true,
      createdAt: null,
      modifiedAt: null,
    }
  })
  const workspace = {
    root: '/library',
    phase: 'ready',
    client: { vaultPath: '/library', previewNoteSource, ensurePage },
    entries: [
      makeEntry({ path: '/library/owner.md', title: 'Owner' }),
      makeEntry({ path: '/library/source.md', title: 'Source' }),
      makeEntry({ path: '/elsewhere/private.md', title: 'Source' }),
    ],
    pages: [],
    flush: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
  }
  state.workspace = workspace
  return workspace
}
beforeEach(() => vi.clearAllMocks())
async function choose() {
  const input = screen.getByLabelText('Mnemonic source')
  fireEvent.change(input, { target: { value: 'Source' } })
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  fireEvent.keyDown(input, { key: 'Enter' })
  await screen.findByText('Source article')
}
it('keeps selection and Cancel read-only, and excludes the owner and other Libraries', async () => {
  const workspace = fixture(),
    apply = vi.fn(),
    close = vi.fn()
  render(
    <NoteBackSourceDialog
      open
      locale="en"
      ownerPath="/library/owner.md"
      ownerPageId="owner"
      onOpenChange={close}
      onApplyBack={apply}
    />
  )
  await choose()
  expect(workspace.client.ensurePage).not.toHaveBeenCalled()
  expect(workspace.flush).not.toHaveBeenCalled()
  expect(screen.queryByText('/elsewhere/private.md')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true }))
  expect(close).toHaveBeenCalledWith(false)
  expect(apply).not.toHaveBeenCalled()
})
it('requires an explicit face and only then registers and applies the selected source', async () => {
  const workspace = fixture(),
    apply = vi.fn(async () => {}),
    close = vi.fn()
  render(
    <NoteBackSourceDialog
      open
      locale="en"
      ownerPath="/library/owner.md"
      ownerPageId="owner"
      onOpenChange={close}
      onApplyBack={apply}
    />
  )
  await choose()
  expect(
    screen.getByRole('button', { name: 'Use source', exact: true })
  ).toBeDisabled()
  fireEvent.click(screen.getByRole('combobox', { name: 'Source face' }))
  fireEvent.click(
    await screen.findByRole('option', { name: 'Article', exact: true })
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Use source', exact: true })
  )
  await waitFor(() =>
    expect(apply).toHaveBeenCalledWith({
      kind: 'page',
      pageId: target,
      face: 'front',
    })
  )
  expect(workspace.client.ensurePage).toHaveBeenCalledWith(
    'source.md',
    'a'.repeat(64)
  )
  expect(workspace.flush).toHaveBeenCalledTimes(2)
  await waitFor(() => expect(close).toHaveBeenCalledWith(false))
})
it('retains a partial registration and retries the owner action without ensuring again', async () => {
  const workspace = fixture(),
    apply = vi
      .fn()
      .mockRejectedValueOnce(Error('pending owner write'))
      .mockResolvedValue(undefined)
  render(
    <NoteBackSourceDialog
      open
      locale="en"
      ownerPath="/library/owner.md"
      ownerPageId="owner"
      onOpenChange={vi.fn()}
      onApplyBack={apply}
    />
  )
  await choose()
  fireEvent.click(screen.getByRole('combobox', { name: 'Source face' }))
  fireEvent.click(
    await screen.findByRole('option', { name: 'Mnemonic', exact: true })
  )
  await screen.findByText('Source mnemonic')
  fireEvent.click(
    screen.getByRole('button', { name: 'Use source', exact: true })
  )
  await screen.findByText('pending owner write', { exact: false })
  expect(
    screen.getByText(
      'Changes to the source file may already be saved. Your draft is kept. Retry, or open recovery if needed.'
    )
  ).toBeVisible()
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }))
  })
  await waitFor(() => expect(apply).toHaveBeenCalledTimes(2))
  expect(workspace.client.ensurePage).toHaveBeenCalledOnce()
})
