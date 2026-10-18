import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useDebouncedEditorChange } from './editorChangeDebounce'
afterEach(() => vi.useRealTimers())
it('retains a failed flush so an explicit retry serializes the pending draft', () => {
  vi.useFakeTimers()
  const onFlush = vi.fn().mockImplementationOnce(() => { throw Error('serializer unavailable') }).mockImplementation(() => {})
  const { result } = renderHook(() => useDebouncedEditorChange({ onFlush, suppressChangeRef: { current: false } }))
  act(() => result.current.handleEditorChange())
  expect(() => result.current.flushPendingEditorChange()).toThrow('serializer unavailable')
  expect(result.current.flushPendingEditorChange()).toBe(true)
  expect(onFlush).toHaveBeenCalledTimes(2)
  expect(result.current.flushPendingEditorChange()).toBe(false)
})
it('keeps a newer change scheduled during a successful flush', () => {
  vi.useFakeTimers()
  let notify = () => {}
  const onFlush = vi.fn().mockImplementationOnce(() => notify()).mockImplementation(() => {})
  const { result } = renderHook(() => useDebouncedEditorChange({ onFlush, suppressChangeRef: { current: false } }))
  notify = result.current.handleEditorChange
  act(() => result.current.handleEditorChange())
  expect(result.current.flushPendingEditorChange()).toBe(true)
  expect(result.current.flushPendingEditorChange()).toBe(true)
  expect(onFlush).toHaveBeenCalledTimes(2)
})
