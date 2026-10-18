import { renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import { editorResourceVisit } from './editorResourceScope'
import { useRegisterEditorResources } from './useEditorResources'

it('ends resource imports from the outgoing face even when editor, note and board IDs are reused', () => {
  const editor = {}
  const { rerender, unmount } = renderHook(({ face }) => useRegisterEditorResources(editor, '/library', '/library/a.md', face), { initialProps: { face: 'front' } })
  const front = editorResourceVisit(editor)!
  rerender({ face: 'back' })
  expect(front.isCurrent()).toBe(false)
  expect(editorResourceVisit(editor)).not.toBe(front)
  unmount()
  expect(editorResourceVisit(editor)).toBeNull()
})
