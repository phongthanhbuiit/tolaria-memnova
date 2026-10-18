import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { NoteMemoryInspector } from './NoteMemoryInspector'
import { LearningContext, type LearningWorkspace } from './LearningContext'
import {
  memoryPageId,
  noteMemoryFlowFixture,
} from '../../test-utils/noteMemoryFlowFixture'
import type { NoteMemoryView } from '../../lib/learning/types'
import { writeClipboardText } from '../../utils/clipboardText'
vi.mock('../../utils/clipboardText', () => ({
  writeClipboardText: vi.fn().mockResolvedValue(undefined),
}))
const content = `---\n_memnova_page_id: ${memoryPageId}\n_memnova_learning_version: 1\n_memnova_learning_enabled: false\n_memnova_back_kind: inline\n---\nArticle\n<!-- FLASHCARD:BACK -->\nMnemonic`
function fixture() {
  const data = noteMemoryFlowFixture()
  const view: NoteMemoryView = {
    pageId: memoryPageId,
    path: 'lesson.md',
    sourceHash: 'a'.repeat(64),
    config: { version: 1, enabled: false, back: { kind: 'inline' } },
    state: 'disabled',
    hasBack: true,
    binding: {
      pageId: memoryPageId,
      cardId: data.page.candidates[0].card.id,
      sourceHash: 'a'.repeat(64),
      revision: 4,
    },
    schedule: data.page.candidates[0].card.schedule,
    legacyCardCount: 0,
    diagnostics: [],
    pendingOperations: [],
  }
  const client = {
    ...data.client,
    readNoteMemory: vi.fn().mockResolvedValue(view),
  }
  const workspace = {
    client,
    root: '/qa',
    phase: 'ready',
    clock: 0,
    flush: vi.fn(),
  } as unknown as LearningWorkspace
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LearningContext.Provider value={workspace}>
      {children}
    </LearningContext.Provider>
  )
  return { ...data, view, client, workspace, wrapper }
}
it('shows the real retained schedule separately from immutable pre-conversion metadata without editing either', async () => {
  const data = fixture()
  data.client.noteCompatibility.mockResolvedValue(
    await data.client.noteConversionDetails('operation')
  )
  render(
    <NoteMemoryInspector path="/qa/lesson.md" content={content} locale="en" />,
    { wrapper: data.wrapper }
  )
  const panel = await screen.findByRole('region', {
    name: 'Review schedule · read only',
  })
  expect(within(panel).getByText('7', { exact: true })).toBeInTheDocument()
  expect(within(panel).getByText('2', { exact: true })).toBeInTheDocument()
  expect(within(panel).queryByRole('textbox')).not.toBeInTheDocument()
  fireEvent.click(
    screen.getByRole('button', { name: /^Card data before conversion/ })
  )
  expect(
    await screen.findByText(data.page.candidates[0].propertiesRaw, {
      exact: true,
    })
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Copy properties' }))
  await waitFor(() =>
    expect(writeClipboardText).toHaveBeenCalledWith(
      data.page.candidates[0].propertiesRaw
    )
  )
  expect(data.workspace.flush).not.toHaveBeenCalled()
  expect(data.client.applyNoteConversion).not.toHaveBeenCalled()
})
it('does not query or show memory metadata for an ordinary note', () => {
  const data = fixture()
  render(
    <NoteMemoryInspector
      path="/qa/lesson.md"
      content="# Ordinary note"
      locale="en"
    />,
    { wrapper: data.wrapper }
  )
  expect(screen.queryByRole('region')).not.toBeInTheDocument()
  expect(data.client.readNoteMemory).not.toHaveBeenCalled()
})
it('revokes the previous note schedule while a different note is loading and ignores the old response', async () => {
  const data = fixture()
  let finish!: (view: NoteMemoryView) => void
  data.client.readNoteMemory.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  const { rerender } = render(
    <NoteMemoryInspector path="/qa/lesson.md" content={content} locale="en" />,
    { wrapper: data.wrapper }
  )
  const next = content.replaceAll(
    memoryPageId,
    '00000000-0000-0000-0000-000000000003'
  )
  data.client.readNoteMemory.mockRejectedValueOnce(Error('missing source'))
  rerender(
    <NoteMemoryInspector path="/qa/other.md" content={next} locale="en" />
  )
  finish(data.view)
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(screen.queryByText('7', { exact: true })).not.toBeInTheDocument()
})

it('does not reread SQLite metadata on each body keystroke', async () => {
  const data = fixture()
  const { rerender } = render(
    <NoteMemoryInspector path="/qa/lesson.md" content={content} locale="en" />,
    { wrapper: data.wrapper }
  )
  await screen.findByText('7', { exact: true })
  for (let index = 0; index < 5; index++)
    rerender(
      <NoteMemoryInspector
        path="/qa/lesson.md"
        content={`${content}\nNew body ${index}`}
        locale="en"
      />
    )
  expect(data.client.readNoteMemory).toHaveBeenCalledTimes(1)
  expect(data.client.noteCompatibility).toHaveBeenCalledTimes(1)
})
