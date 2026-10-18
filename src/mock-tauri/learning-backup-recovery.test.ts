import { expect, it, vi } from 'vitest'
import { mockLearningCommand } from './learning'

it('does not initialize a browser Library merely to list startup recovery backups', async () => {
  const root = `/unopened-${crypto.randomUUID()}`
  const context = {
    read: vi.fn(),
    write: vi.fn(),
    entries: vi.fn().mockResolvedValue([]),
  }
  await expect(
    mockLearningCommand(
      {
        vaultPath: root,
        libraryId: null,
        request: { kind: 'listRecoveryBackups' },
      },
      context
    )
  ).rejects.toThrow('Library backup identity is unavailable')
  expect(localStorage.getItem(`memnova:qa-learning:${root}`)).toBeNull()
  expect(context.write).not.toHaveBeenCalled()
})

it('binds verification and fresh-root restore to the existing catalog owner without changing the original fixture', async () => {
  const root = `/recovery-${crypto.randomUUID()}`
  const context = {
    read: vi.fn(),
    write: vi.fn(),
    entries: vi.fn().mockResolvedValue([]),
  }
  const call = (
    kind: string,
    libraryId: string | null,
    extra: Record<string, unknown> = {}
  ) =>
    mockLearningCommand(
      { vaultPath: root, libraryId, request: { kind, ...extra } },
      context
    )
  const description = (await call('describe', null)) as { libraryId: string }
  const backup = (await call('createBackup', description.libraryId)) as {
    id: string
  }
  const before = localStorage.getItem(`memnova:qa-learning:${root}`)
  expect(await call('listRecoveryBackups', null)).toMatchObject({
    libraryId: description.libraryId,
    backups: [{ id: backup.id }],
  })
  await expect(
    call('verifyRecoveryBackup', null, { backupId: backup.id })
  ).rejects.toThrow('Library identity changed')
  await expect(
    call('restoreRecoveryBackup', 'other', { backupId: backup.id })
  ).rejects.toThrow('Library identity changed')
  await call('verifyRecoveryBackup', description.libraryId, {
    backupId: backup.id,
  })
  expect(
    await call('restoreRecoveryBackup', description.libraryId, {
      backupId: backup.id,
    })
  ).toMatchObject({
    path: expect.stringContaining(`${root}/.memnova/restores/`),
  })
  expect(localStorage.getItem(`memnova:qa-learning:${root}`)).toBe(before)
})
