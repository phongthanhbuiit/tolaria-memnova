import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { PageFlashcards } from './PageFlashcards'
const { workspace } = vi.hoisted(() => ({ workspace: { phase: 'ready', client: { vaultPath: '/current', ensurePage: vi.fn() }, cards: [], refresh: vi.fn() } }))
vi.mock('./LearningContext', () => ({ useLearningWorkspace: () => workspace }))
beforeEach(() => { workspace.client.ensurePage.mockReset(); workspace.refresh.mockResolvedValue(undefined) })
it('shows an unavailable state for a lesson outside the current library instead of loading forever', () => {
  render(<PageFlashcards path="/mounted/lesson.md" locale="en" />)
  expect(screen.getByRole('alert')).toBeVisible()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add card' })).toBeDisabled()
})
it('retries page registration after a transient database failure', async () => {
  workspace.client.ensurePage.mockRejectedValueOnce(new Error('database is locked')).mockResolvedValueOnce({ id: 'page', path: 'lesson.md' })
  render(<PageFlashcards path="/current/lesson.md" locale="en" />)
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add card' })).toBeEnabled())
  expect(workspace.client.ensurePage).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
