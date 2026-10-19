import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { NoteMemoryStatus } from './NoteMemoryStatus'

it('distinguishes due and future schedules without treating a paused note as due', () => {
  const { rerender } = render(<NoteMemoryStatus state="ready" due="2020-01-01Z" clock={Date.parse('2026-01-01Z')} locale="en" />)
  expect(screen.getByText('Due')).toBeInTheDocument()
  rerender(<NoteMemoryStatus state="ready" due="2030-01-01Z" clock={Date.parse('2026-01-01Z')} locale="en" />)
  expect(screen.getByText('Scheduled')).toBeInTheDocument()
  rerender(<NoteMemoryStatus state="disabled" due="2020-01-01Z" locale="en" />)
  expect(screen.getByText('Paused')).toBeInTheDocument()
  expect(screen.queryByText('Due')).not.toBeInTheDocument()
})

it('keeps an ordinary note ordinary and labels non-ready states with text as well as color', () => {
  const { container, rerender } = render(<NoteMemoryStatus state="ordinary" locale="en" />)
  expect(container).toBeEmptyDOMElement()
  rerender(<NoteMemoryStatus state="pending" locale="en" />)
  expect(screen.getByText('Needs attention')).toHaveAttribute('data-tone', 'warning')
  rerender(<NoteMemoryStatus state="invalid" locale="en" />)
  expect(screen.getByText('Needs attention')).toHaveAttribute('data-tone', 'error')
  rerender(<NoteMemoryStatus state="draft" locale="vi" />)
  expect(container).not.toBeEmptyDOMElement()
})
