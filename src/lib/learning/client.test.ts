import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { LearningClient } from './client'

vi.mock('../../mock-tauri', () => ({ isTauri: () => true, mockInvoke: vi.fn() }))

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

  it.each([2, 3, 4, 5])('connects to additive schema version %s', async schemaVersion => {
    vi.mocked(invoke).mockResolvedValue({ libraryId: 'library-1', schemaVersion, migrationState: 'legacy' })
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

it('lists and verifies backups using the bound identity and an ID-only request', async () => {
 vi.mocked(invoke).mockResolvedValueOnce({libraryId:'library',schemaVersion:2}).mockResolvedValue([])
 const client=await LearningClient.connect('/qa')
 await client.listBackups()
 expect(invoke).toHaveBeenLastCalledWith('learning_command',{vaultPath:'/qa',libraryId:'library',request:{kind:'listBackups'}})
 await client.verifyBackup('backup-id')
 expect(invoke).toHaveBeenLastCalledWith('learning_command',{vaultPath:'/qa',libraryId:'library',request:{kind:'verifyBackup',backupId:'backup-id'}})
})

it('reads a source preview by UUID with the bound library and no session request',async()=>{
 vi.mocked(invoke).mockResolvedValueOnce({libraryId:'library',schemaVersion:3}).mockResolvedValue({id:'page'})
 const client=await LearningClient.connect('/qa')
 await client.readStudyPage('source-id')
 expect(invoke).toHaveBeenLastCalledWith('learning_command',{vaultPath:'/qa',libraryId:'library',request:{kind:'readStudyPage',pageId:'source-id'}})
})
it('binds page definition compare-and-swap to the connected library',async()=>{
 vi.mocked(invoke).mockResolvedValueOnce({libraryId:'library',schemaVersion:4}).mockResolvedValue({})
 const client=await LearningClient.connect('/qa')
 await client.pagePropertyDefinitions('page')
 expect(invoke).toHaveBeenLastCalledWith('learning_command',{vaultPath:'/qa',libraryId:'library',request:{kind:'pagePropertyDefinitions',pageId:'page'}})
 const next={flag:{valueKind:'boolean' as const}}
 await client.setPagePropertyDefinitions('page',{},next)
 expect(invoke).toHaveBeenLastCalledWith('learning_command',{vaultPath:'/qa',libraryId:'library',request:{kind:'setPagePropertyDefinitions',pageId:'page',expected:{},definitions:next}})
})
