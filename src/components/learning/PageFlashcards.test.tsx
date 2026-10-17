import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { PageFlashcards } from './PageFlashcards'
vi.mock('./LearningContext', () => ({ useLearningWorkspace: () => ({ phase: 'ready', client: { vaultPath: '/current', ensurePage: vi.fn() }, cards: [] }) }))
it('shows an unavailable state for a lesson outside the current library instead of loading forever', () => {
  render(<PageFlashcards path="/mounted/lesson.md" locale="en" />)
  expect(screen.getByRole('alert')).toBeVisible()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add card' })).toBeDisabled()
})
