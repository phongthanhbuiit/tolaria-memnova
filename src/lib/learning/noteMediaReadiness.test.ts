import { fireEvent } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { watchNoteMedia } from './noteMediaReadiness'
it('waits for every image to decode, revokes success on error and ignores events after cleanup', () => {
  const images: HTMLImageElement[] = []
  const status = vi.fn()
  const stop = watchNoteMedia(
    [
      { url: 'one.svg', kind: 'image' },
      { url: 'two.svg', kind: 'image' },
    ],
    status,
    () => {
      const image = document.createElement('img')
      images.push(image)
      return image
    }
  )
  expect(status).toHaveBeenLastCalledWith('loading')
  Object.defineProperty(images[0], 'naturalWidth', { value: 32 })
  fireEvent.load(images[0])
  expect(status).toHaveBeenLastCalledWith('loading')
  Object.defineProperty(images[1], 'naturalWidth', { value: 32 })
  fireEvent.load(images[1])
  expect(status).toHaveBeenLastCalledWith('ready')
  fireEvent.error(images[1])
  expect(status).toHaveBeenLastCalledWith('error')
  stop()
  status.mockClear()
  fireEvent.load(images[1])
  expect(status).not.toHaveBeenCalled()
})
it('rejects an image load with no decodable pixels and accepts text without fetching media', () => {
  const image = document.createElement('img'),
    status = vi.fn()
  const stop = watchNoteMedia(
    [{ url: 'broken.svg', kind: 'image' }],
    status,
    () => image
  )
  fireEvent.load(image)
  expect(status).toHaveBeenLastCalledWith('error')
  stop()
  const empty = vi.fn()
  watchNoteMedia([], empty)
  expect(empty.mock.calls).toEqual([['ready']])
})
