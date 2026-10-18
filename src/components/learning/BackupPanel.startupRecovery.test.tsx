import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { LearningDashboard } from './LearningDashboard'
import { PageFlashcards } from './PageFlashcards'

const { api, workspace } = vi.hoisted(() => ({
  api: { listBackups: vi.fn(), verifyBackup: vi.fn(), restoreBackup: vi.fn() },
  workspace: {
    root: '/recovery',
    phase: 'error',
    error: 'Learning database is missing',
    client: null,
    pages: [],
    notes: [],
    cards: [],
    stats: null,
    clock: 0,
    scopeForPage: vi.fn(),
    requestStudy: vi.fn(),
    reconnect: vi.fn(),
    flush: vi.fn(),
    openLibrary: vi.fn(),
  },
}))
vi.mock('./LearningContext', () => ({ useLearningWorkspace: () => workspace }))
vi.mock('../../lib/learning/backupRecoveryClient', () => ({
  LibraryBackupRecoveryClient: vi.fn(function () {
    return api
  }),
}))
vi.mock('../../lib/telemetry', () => ({ trackEvent: vi.fn() }))

it('offers verified fresh-folder restore from the error screen without initializing a replacement Store', async () => {
  const descriptor = {
    id: 'backup',
    libraryId: 'owner',
    createdAt: Date.now(),
    fileCount: 3,
    bytes: 100,
  }
  api.listBackups.mockResolvedValue([{ id: 'backup', descriptor, error: null }])
  api.verifyBackup.mockResolvedValue(descriptor)
  api.restoreBackup.mockResolvedValue({
    path: '/recovery/.memnova/restores/fresh',
  })
  render(<LearningDashboard mode="home" locale="en" onOpenPage={vi.fn()} />)
  await screen.findByRole('combobox', { name: 'Backup history' })
  expect(
    screen.queryByRole('button', { name: 'Create backup', exact: true })
  ).toBeNull()
  expect(
    screen.queryByRole('button', { name: 'Prepare learning data', exact: true })
  ).toBeNull()
  expect(
    screen.getByRole('button', { name: 'Restore backup', exact: true })
  ).toBeDisabled()
  fireEvent.click(
    screen.getByRole('button', { name: 'Verify backup', exact: true })
  )
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Restore backup', exact: true })
    ).toBeEnabled()
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Restore backup', exact: true })
  )
  await waitFor(() =>
    expect(workspace.openLibrary).toHaveBeenCalledWith(
      '/recovery/.memnova/restores/fresh'
    )
  )
  expect(workspace.requestStudy).not.toHaveBeenCalled()
})

it('also exposes recovery when the note learning tab is open during a connection failure', async () => {
  api.listBackups.mockResolvedValue([])
  render(<PageFlashcards path="/recovery/lesson.md" locale="en" />)
  await screen.findByRole('region', { name: 'Backup history' })
  expect(
    screen.queryByRole('button', { name: 'Prepare learning data', exact: true })
  ).toBeNull()
})
