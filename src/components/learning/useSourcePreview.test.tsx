import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useSourcePreview } from './useSourcePreview'
import type { NoteSourcePreview } from '../../lib/learning/types'

const preview = (path: string): NoteSourcePreview => ({
  pageId: null,
  path,
  face: 'front',
  content: path,
  sourceHash: 'a'.repeat(64),
  fingerprint: 'b'.repeat(64),
  media: [],
  hasBack: false,
  backLinked: false,
})
it('only reads a chosen source and ignores the response of a previous choice', async () => {
  let finish!: (value: NoteSourcePreview) => void
  const client = {
    vaultPath: '/library',
    previewNoteSource: vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      .mockResolvedValue(preview('b.md')),
  }
  const { result, rerender } = renderHook(
    ({ path }) => useSourcePreview({ client, path, face: 'front', open: true }),
    { initialProps: { path: 'a.md' } }
  )
  rerender({ path: 'b.md' })
  await waitFor(() => expect(result.current.preview?.path).toBe('b.md'))
  await act(async () => finish(preview('a.md')))
  expect(result.current.preview?.path).toBe('b.md')
})
it('does not read or write while closed, and rejects selecting the owner before reading it', async () => {
  const client = { vaultPath: '/library', previewNoteSource: vi.fn() }
  const { result, rerender } = renderHook(
    ({ open }) =>
      useSourcePreview({
        client,
        path: 'a.md',
        face: 'front',
        open,
        ownerPath: '/library/a.md',
      }),
    { initialProps: { open: false } }
  )
  expect(client.previewNoteSource).not.toHaveBeenCalled()
  rerender({ open: true })
  await waitFor(() => expect(result.current.error).toContain('self-source'))
  expect(client.previewNoteSource).not.toHaveBeenCalled()
})
it('rejects a copied owner UUID and never falls back to a different face on preview failure', async () => {
  const client = {
    vaultPath: '/library',
    previewNoteSource: vi
      .fn()
      .mockResolvedValue({ ...preview('copy.md'), pageId: 'owner' }),
  }
  const { result, rerender } = renderHook(
    ({ face }) =>
      useSourcePreview({
        client,
        path: 'copy.md',
        face,
        open: true,
        ownerPageId: 'owner',
      }),
    { initialProps: { face: 'front' as 'front' | 'back' } }
  )
  await waitFor(() => expect(result.current.error).toContain('self-source'))
  client.previewNoteSource.mockRejectedValueOnce(Error('missing-source-back'))
  rerender({ face: 'back' })
  await waitFor(() =>
    expect(result.current.error).toContain('missing-source-back')
  )
  expect(result.current.preview).toBeNull()
})
