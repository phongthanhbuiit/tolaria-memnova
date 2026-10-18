import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { noteMemoryFlowFixture } from '../../test-utils/noteMemoryFlowFixture'
import { NoteConversionDialog } from './NoteConversionDialog'
vi.mock('../../lib/telemetry', () => ({ trackEvent: vi.fn() }))
it('requires visible face/history choices and same-goal confirmation before applying', async () => {
  const { client } = noteMemoryFlowFixture()
  render(<NoteConversionDialog client={client} open locale="en" onOpenChange={vi.fn()} flush={vi.fn()} onUpdated={vi.fn()} />)
  await screen.findByText('Biology')
  expect(screen.getByRole('button', { name: 'Convert note', exact: true })).toBeDisabled()
  fireEvent.click(screen.getByRole('combobox', { name: 'Article source' })); fireEvent.click(await screen.findByRole('option', { name: 'From note' }))
  fireEvent.click(screen.getByRole('combobox', { name: 'Mnemonic source' })); fireEvent.click(await screen.findByRole('option', { name: 'From note' }))
  fireEvent.click(screen.getByRole('combobox', { name: 'Learning history' })); fireEvent.click(await screen.findByRole('option', { name: /Keep old history/ }))
  expect(screen.getByRole('button', { name: 'Convert note', exact: true })).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', { name: 'This card covers the same thing to memorize' }))
  fireEvent.click(screen.getByRole('button', { name: 'Convert note', exact: true }))
  await waitFor(() => expect(client.applyNoteConversion).toHaveBeenCalledTimes(1))
  expect(client.applyNoteConversion.mock.calls[0][0]).toMatchObject({ front: { kind: 'markdown' }, back: { kind: 'inline', source: { kind: 'markdown' } }, memory: { kind: 'reuse', confirmedSameGoal: true } })
})
it('cancel before apply does not flush or write and preserves raw compatibility metadata', async () => {
  const { client } = noteMemoryFlowFixture(), flush = vi.fn(), onOpenChange = vi.fn()
  render(<NoteConversionDialog client={client} open locale="en" onOpenChange={onOpenChange} flush={flush} onUpdated={vi.fn()} />)
  await screen.findByText('Biology')
  fireEvent.click(screen.getByRole('button', { name: /Card data before conversion/ }))
  expect(screen.getByText(/9007199254740993/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onOpenChange).toHaveBeenCalledWith(false); expect(flush).not.toHaveBeenCalled(); expect(client.applyNoteConversion).not.toHaveBeenCalled()
})
it('skipping a note does not claim all notes were converted or write anything', async () => {
  const { client } = noteMemoryFlowFixture()
  render(<NoteConversionDialog client={client} open locale="en" onOpenChange={vi.fn()} flush={vi.fn()} onUpdated={vi.fn()} />)
  await screen.findByText('Biology')
  fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
  expect(screen.queryByText('No notes need conversion.')).not.toBeInTheDocument()
  expect(screen.getByText('Skipped: 1')).toBeInTheDocument()
  expect(client.applyNoteConversion).not.toHaveBeenCalled()
})

it('registers a missing note identity only after an explicit preparation click, then requires fresh conversion choices', async () => {
  const f = noteMemoryFlowFixture()
  const unregistered = { ...f.page, pageId: null, classification: 'legacyMarkdown' as const, candidates: [] }
  const registered = { ...unregistered, pageId: f.page.pageId, fingerprint: '1'.repeat(64) }
  f.client.previewNoteConversion.mockResolvedValueOnce({ ...f.preview, pages: [unregistered] }).mockResolvedValueOnce({ ...f.preview, pages: [unregistered] }).mockResolvedValue({ ...f.preview, pages: [registered] })
  const selected = { path: f.page.path, face: 'front' as const, pageId: null as string | null, fingerprint: '2'.repeat(64), sourceHash: f.page.sourceHash, content: f.page.front, media: [], hasBack: true, backLinked: false }
  const client = { ...f.client, previewNoteSource: vi.fn().mockResolvedValueOnce(selected).mockResolvedValueOnce(selected).mockResolvedValue({ ...selected, pageId: f.page.pageId }), ensurePage: vi.fn().mockResolvedValue({ id: f.page.pageId, path: f.page.path }) }
  const flush = vi.fn().mockResolvedValue(undefined), updated = vi.fn().mockResolvedValue(undefined)
  render(<NoteConversionDialog client={client} open locale="en" onOpenChange={vi.fn()} flush={flush} onUpdated={updated} />)
  await screen.findByText('Biology')
  expect(client.ensurePage).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Prepare this note' }))
  await waitFor(() => expect(client.ensurePage).toHaveBeenCalledWith(f.page.path, f.page.sourceHash))
  await waitFor(() => expect(updated).toHaveBeenCalledOnce())
  expect(flush).toHaveBeenCalledOnce()
  expect(client.applyNoteConversion).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Convert note', exact: true })).toBeDisabled()
})
