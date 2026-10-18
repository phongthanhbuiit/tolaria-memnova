import { expect, it, vi } from 'vitest'
import {
  registerSelectedSource,
  SourceRegistrationError,
} from './sourceSelection'
import type { NoteSourcePreview } from './types'

const selected: NoteSourcePreview = {
  pageId: null,
  path: 'source.md',
  face: 'front',
  content: 'Source',
  sourceHash: 'a'.repeat(64),
  fingerprint: 'b'.repeat(64),
  media: [],
  hasBack: true,
  backLinked: false,
}
function fixture() {
  const page = {
    id: '22222222-2222-4222-8222-222222222222',
    path: 'source.md',
    title: 'Source',
    available: true,
    createdAt: null,
    modifiedAt: null,
  }
  const previewNoteSource = vi
    .fn()
    .mockResolvedValueOnce(selected)
    .mockResolvedValue({
      ...selected,
      pageId: page.id,
      sourceHash: 'c'.repeat(64),
    })
  return {
    page,
    client: {
      vaultPath: '/library',
      previewNoteSource,
      ensurePage: vi.fn().mockResolvedValue(page),
    },
  }
}
it('registers only the exact inspected source and revalidates its selected face after UUID insertion', async () => {
  const { client, page } = fixture()
  await expect(
    registerSelectedSource(client, selected, () => true)
  ).resolves.toEqual(page)
  expect(client.ensurePage).toHaveBeenCalledWith(
    'source.md',
    selected.sourceHash
  )
  expect(client.previewNoteSource).toHaveBeenCalledTimes(2)
})
it('rejects changed inspected bytes before source registration', async () => {
  const { client } = fixture()
  client.previewNoteSource
    .mockReset()
    .mockResolvedValue({ ...selected, sourceHash: 'd'.repeat(64) })
  await expect(
    registerSelectedSource(client, selected, () => true)
  ).rejects.toMatchObject({ registrationAttempted: false })
  expect(client.ensurePage).not.toHaveBeenCalled()
})
it('cannot register after selection was cancelled while read-only revalidation was pending', async () => {
  const { client } = fixture()
  let finish!: (value: NoteSourcePreview) => void,
    active = true
  client.previewNoteSource.mockReset().mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const pending = registerSelectedSource(client, selected, () => active)
  active = false
  finish(selected)
  await expect(pending).rejects.toMatchObject({ registrationAttempted: false })
  expect(client.ensurePage).not.toHaveBeenCalled()
})
it('reports possible partial registration if the source changes after its UUID was applied', async () => {
  const { client, page } = fixture()
  client.previewNoteSource
    .mockReset()
    .mockResolvedValueOnce(selected)
    .mockResolvedValue({
      ...selected,
      pageId: page.id,
      fingerprint: 'd'.repeat(64),
    })
  try {
    await registerSelectedSource(client, selected, () => true)
    throw Error('Expected selection conflict')
  } catch (error) {
    expect(error).toBeInstanceOf(SourceRegistrationError)
    expect(error).toMatchObject({ registrationAttempted: true })
  }
  expect(client.ensurePage).toHaveBeenCalledOnce()
})
