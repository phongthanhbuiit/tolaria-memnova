import { beforeEach, expect, it, vi } from 'vitest'
import { LibraryBackupRecoveryClient } from './backupRecoveryClient'
import { learningInvoke } from './client'
vi.mock('./client', () => ({ learningInvoke: vi.fn() }))
beforeEach(() => vi.clearAllMocks())

it('requires a catalog identity before verify/restore and never describes or initializes the Store', async () => {
  const client = new LibraryBackupRecoveryClient('/library/')
  await expect(client.restoreBackup('backup')).rejects.toThrow(
    'backup-catalog-required'
  )
  expect(learningInvoke).not.toHaveBeenCalled()
  vi.mocked(learningInvoke)
    .mockResolvedValueOnce({ libraryId: 'owner', backups: [] })
    .mockResolvedValueOnce({ id: 'backup' })
    .mockResolvedValueOnce({ path: '/library/.memnova/restores/fresh' })
  expect(await client.listBackups()).toEqual([])
  await client.verifyBackup('backup')
  expect(await client.restoreBackup('backup')).toEqual({
    path: '/library/.memnova/restores/fresh',
  })
  expect(learningInvoke).toHaveBeenNthCalledWith(1, 'learning_command', {
    vaultPath: '/library',
    libraryId: null,
    request: { kind: 'listRecoveryBackups' },
  })
  expect(learningInvoke).toHaveBeenNthCalledWith(2, 'learning_command', {
    vaultPath: '/library',
    libraryId: 'owner',
    request: { kind: 'verifyRecoveryBackup', backupId: 'backup' },
  })
  expect(learningInvoke).toHaveBeenNthCalledWith(3, 'learning_command', {
    vaultPath: '/library',
    libraryId: 'owner',
    request: { kind: 'restoreRecoveryBackup', backupId: 'backup' },
  })
})

it('does not let a late catalog replace a newer owner identity', async () => {
  const client = new LibraryBackupRecoveryClient('/library')
  let finish: (value: unknown) => void = () => {}
  vi.mocked(learningInvoke)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    .mockResolvedValueOnce({ libraryId: 'new', backups: [] })
    .mockResolvedValueOnce({ id: 'backup' })
  const first = client.listBackups()
  await client.listBackups()
  finish({ libraryId: 'old', backups: [] })
  await expect(first).rejects.toThrow('stale-backup-catalog')
  await client.verifyBackup('backup')
  expect(vi.mocked(learningInvoke).mock.calls[2][1].libraryId).toBe('new')
})
