import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { LearningError } from './LearningError'
import { writeClipboardText } from '../../utils/clipboardText'

vi.mock('../../utils/clipboardText', () => ({ writeClipboardText: vi.fn().mockResolvedValue(undefined) }))

it('offers a localized action message with collapsed, copyable technical details', async () => {
  render(<LearningError error="missing-source: diagnostic" locale="en" />)
  expect(screen.getByRole('alert')).toHaveTextContent('The current source cannot be read')
  const details = screen.getByRole('button', { name: 'Technical details' })
  expect(details).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('button', { name: 'Copy', exact: true })).not.toBeInTheDocument()
  fireEvent.click(details)
  fireEvent.click(screen.getByRole('button', { name: 'Copy', exact: true }))
  await waitFor(() => expect(writeClipboardText).toHaveBeenCalledWith('missing-source: diagnostic'))
})

it('reports clipboard failure and does not carry that feedback to a different error', async () => {
  vi.mocked(writeClipboardText).mockRejectedValueOnce(Error('clipboard unavailable'))
  const { rerender } = render(<LearningError error="note-recovery-required" locale="en" />)
  expect(screen.getByRole('alert')).toHaveTextContent('Your saved draft is retained')
  fireEvent.click(screen.getByRole('button', { name: 'Technical details' }))
  fireEvent.click(screen.getByRole('button', { name: 'Copy', exact: true }))
  await screen.findByRole('status')
  rerender(<LearningError error="another error" locale="en" />)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
