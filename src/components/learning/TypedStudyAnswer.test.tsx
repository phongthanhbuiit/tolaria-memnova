import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { TypedStudyAnswer } from './TypedStudyAnswer'

it('does not submit a composing Enter, including Safari compositionend before keydown', () => {
  const onResult = vi.fn()
  render(<TypedStudyAnswer answer="Đất nước" locale="vi" disabled={false} onResult={onResult} />)
  const field = screen.getByRole('textbox', { name: 'Bạn trả lời' })
  fireEvent.compositionStart(field)
  fireEvent.change(field, { target: { value: 'dat nuoc' } })
  fireEvent.keyDown(field, { key: 'Enter', isComposing: true })
  fireEvent.compositionEnd(field)
  fireEvent.keyDown(field, { key: 'Enter', keyCode: 229 })
  expect(onResult).not.toHaveBeenCalled()
  fireEvent.keyDown(field, { key: 'Enter' })
  expect(onResult).toHaveBeenCalledWith('close')
  expect(screen.getByRole('status')).toHaveTextContent('Gần đúng')
  expect(screen.getByText('Đất nước')).toBeVisible()
})
