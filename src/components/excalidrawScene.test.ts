import { expect, it } from 'vitest'
import { readScene } from './excalidrawScene'

it('loads empty and saved scenes but rejects unsupported data', () => {
  expect(readScene('{}')?.elements).toEqual([])
  expect(readScene('{"type":"excalidraw","version":2,"elements":[],"files":{}}')?.files).toEqual({})
  expect(readScene('{"store":{}}')).toBeNull()
  expect(readScene('broken')).toBeNull()
})
