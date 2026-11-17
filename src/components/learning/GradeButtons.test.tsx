import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GradeButtons } from './GradeButtons'

describe('GradeButtons', () => {
  it('forwards each rating and its pointer event to the owning study flow', () => {
    const onGrade = vi.fn()
    render(<GradeButtons locale="en" disabled={false} interval={rating => `interval ${rating}`} onGrade={onGrade} />)
    for (const [index, button] of screen.getAllByRole('button').entries()) {
      fireEvent.click(button, { clientX: 120, clientY: 240 })
      expect(onGrade).toHaveBeenNthCalledWith(index + 1, index + 1, expect.objectContaining({ clientX: 120, clientY: 240 }))
      expect(button).toHaveTextContent(`interval ${index + 1}`)
    }
  })

  it('keeps all ratings unavailable when the owning flow is not ready', () => {
    const onGrade = vi.fn()
    render(<GradeButtons locale="en" disabled interval={() => ''} onGrade={onGrade} />)
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
      fireEvent.click(button)
    }
    expect(onGrade).not.toHaveBeenCalled()
  })

  it('preserves caller accessibility labels and test ids without replacing grade metadata', () => {
    render(<GradeButtons locale="en" disabled={false} interval={() => 'tomorrow'} onGrade={() => {}} buttonProps={rating => ({ 'aria-label': `Grade ${rating}`, 'data-testid': `legacy-${rating}` })} />)
    expect(screen.getByRole('button', { name: 'Grade 3' })).toHaveAttribute('data-note-grade', '3')
    expect(screen.getByTestId('legacy-3')).toHaveAccessibleName('Grade 3')
  })
})
