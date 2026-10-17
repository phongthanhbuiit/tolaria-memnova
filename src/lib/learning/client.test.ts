import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { LearningClient } from './client'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

describe('learning IPC client', () => {
  beforeEach(() => vi.resetAllMocks())
  it('binds every operation to the connected library identity', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({ libraryId: 'library-1', schemaVersion: 1 }).mockResolvedValueOnce([])
    const client = await LearningClient.connect('/library')
    expect(client.libraryId).toBe('library-1')
    await expect(client.listCards('page-1')).resolves.toEqual([])
    expect(invoke).toHaveBeenLastCalledWith('learning_command', {
      vaultPath: '/library', libraryId: 'library-1', request: { kind: 'listCards', pageId: 'page-1', includeTrashed: false },
    })
  })
  it('rejects an incompatible backend instead of treating missing data as an empty library', async () => {
    vi.mocked(invoke).mockResolvedValue({ libraryId: 'library-1', schemaVersion: 99 })
    await expect(LearningClient.connect('/library')).rejects.toThrow('Unsupported learning database')
  })

  it('connects to the additive schema-v2 upgrade', async () => {
    vi.mocked(invoke).mockResolvedValue({ libraryId: 'library-1', schemaVersion: 2, migrationState: 'legacy' })
    await expect(LearningClient.connect('/library')).resolves.toMatchObject({ libraryId: 'library-1' })
  })
  it('propagates persistence failures to the editing UI', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({ libraryId: 'library-1', schemaVersion: 1 }).mockRejectedValueOnce(new Error('Disk full'))
    const client = await LearningClient.connect('/library')
    await expect(client.cloneCard('card-1')).rejects.toThrow('Disk full')
  })

  it('previews legacy data without initializing a database connection', async () => {
    const preview = { pageCount: 4, cardCount: 3, fingerprint: 'source-snapshot' }
    vi.mocked(invoke).mockResolvedValue(preview)
    await expect(LearningClient.previewMigration('/library')).resolves.toEqual(preview)
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith('learning_command', {
      vaultPath: '/library', libraryId: null, request: { kind: 'previewMigration' },
    })
  })
  it('keeps migration consent and resumable batches bound to the library', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({ libraryId: 'library-1', schemaVersion: 2 }).mockResolvedValue({ state: 'migrating' })
    const client = await LearningClient.connect('/library')
    await client.beginMigration('preview-hash', '{"totalXp":42}')
    expect(invoke).toHaveBeenLastCalledWith('learning_command', {
      vaultPath: '/library', libraryId: 'library-1', request: { kind: 'beginMigration', fingerprint: 'preview-hash', profileRaw: '{"totalXp":42}' },
    })
    await client.resumeMigration(25)
    expect(invoke).toHaveBeenLastCalledWith('learning_command', {
      vaultPath: '/library', libraryId: 'library-1', request: { kind: 'resumeMigration', batchSize: 25 },
    })
    await expect(client.migrationStatus()).resolves.toEqual({ state: 'migrating' })
  })

})
