import { renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useLearningDialogDismiss } from './useLearningDialogFocus'

it('keeps a retained external Escape callback aligned with the latest busy guard and owner', () => {
  const first = vi.fn(), second = vi.fn()
  const { result, rerender } = renderHook(({ busy, onChange }) => useLearningDialogDismiss(busy, onChange), { initialProps: { busy: true, onChange: first } })
  const escape = result.current.onEscapeKeyDown
  escape(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(first).not.toHaveBeenCalled()
  rerender({ busy: false, onChange: second })
  escape(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(first).not.toHaveBeenCalled()
  expect(second).toHaveBeenCalledWith(false)
  rerender({ busy: true, onChange: second })
  escape(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(second).toHaveBeenCalledOnce()
})
