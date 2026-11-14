import { expect, it, vi } from 'vitest'
import {
  createVerifiedNoteMedia,
  prepareNoteRenderBlocks,
  noteRenderMedia,
} from './verifiedNoteMedia'
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (path: string) => `asset://localhost${encodeURI(path)}`,
}))
const media = [
  {
    url: 'asset://memnova/attachments/%E1%BA%A3nh.svg',
    path: 'attachments/ảnh.svg',
    sha256: 'a'.repeat(64),
    bytes: 235,
  },
]
it('uses only the exact verified URI and canonical current Library path, with a byte-hash cache key', () => {
  const resolve = createVerifiedNoteMedia('/new-library', media)
  expect(resolve(media[0].url)).toBe(
    `asset://localhost/new-library/attachments/%E1%BA%A3nh.svg?memnova-sha256=${'a'.repeat(64)}`
  )
  expect(resolve('asset://other/attachments/%E1%BA%A3nh.svg')).toBeNull()
  expect(
    resolve('asset://localhost/old-library/attachments/%E1%BA%A3nh.svg')
  ).toBeNull()
  expect(resolve('attachments/ảnh.svg')).toBeNull()
  expect(resolve(`${media[0].url}?ignored=1`)).toBeNull()
  expect(resolve('https://example.com/diagram.svg')).toBe(
    'https://example.com/diagram.svg'
  )
  expect(resolve('http://asset.localhost/foreign.svg')).toBeNull()
})
it('rejects malformed native descriptors instead of guessing a basename or decoding a path twice', () => {
  for (const path of [
    '../secret.svg',
    '/outside/a.svg',
    '.memnova/a.svg',
    'attachments/../secret.svg',
  ]) {
    expect(() =>
      createVerifiedNoteMedia('/library', [{ ...media[0], path }])
    ).toThrow()
  }
  const resolve = createVerifiedNoteMedia('/library', [
    { ...media[0], path: 'attachments/literal%2f.svg' },
  ])
  expect(resolve(media[0].url)).toContain('literal%252f.svg')
})
it('maps media blocks recursively and only preloads referenced canvas media without mutating source', () => {
  const snapshot = JSON.stringify({
    type: 'excalidraw', version: 2,
    elements: [{type:'image', id:'one', fileId:'used'}],
    files: {used:{dataURL:'data:image/png;base64,YQ=='},unused:{dataURL:'private.png'}},

  })
  const blocks = [
    {
      type: 'paragraph',
      children: [{ type: 'image', props: { url: media[0].url } }],
    },
    { type: 'excalidrawBlock', props: { snapshot } },
  ]
  const before = JSON.stringify(blocks),
    resolve = createVerifiedNoteMedia('/library', media)
  const prepared = prepareNoteRenderBlocks(blocks, resolve)
  expect(JSON.stringify(blocks)).toBe(before)
  expect(JSON.stringify(prepared)).toContain('memnova-sha256')
  expect(noteRenderMedia(prepared, resolve)).toEqual([
    { url: resolve(media[0].url), kind: 'image' },
    { url: 'data:image/png;base64,YQ==', kind: 'image' },
  ])
  expect(() =>
    prepareNoteRenderBlocks(
      [{ type: 'image', props: { url: 'private.png' } }],
      resolve
    )
  ).toThrow('unverified-note-media')
})

it('retains a non-media attachment as a link without preloading its bytes as an image', () => {
  const resolve = createVerifiedNoteMedia('/library', [])
  const blocks = [
    {
      type: 'file',
      props: { url: 'attachments/reference.txt', name: 'Reference' },
    },
  ]
  const prepared = prepareNoteRenderBlocks(blocks, resolve)
  expect(prepared).toEqual(blocks)
  expect(noteRenderMedia(prepared, resolve)).toEqual([])
})
