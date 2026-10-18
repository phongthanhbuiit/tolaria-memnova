import { beforeEach, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { LearningClient } from './client'
vi.mock('../../mock-tauri', () => ({ isTauri: () => true, mockInvoke: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
beforeEach(() => vi.resetAllMocks())
it('keeps note source/configuration and recovery operations bound to the Library UUID', async () => {
  vi.mocked(invoke).mockResolvedValueOnce({ libraryId: 'library', schemaVersion: 5 }).mockResolvedValue({ status: 'committed' })
  const client = await LearningClient.connect('/qa')
  await client.readNoteFace('source', 'back')
  expect(invoke).toHaveBeenLastCalledWith('learning_command', { vaultPath: '/qa', libraryId: 'library', request: { kind: 'readNoteFace', pageId: 'source', face: 'back' } })
  await client.readNoteMemory('page')
  expect(invoke).toHaveBeenLastCalledWith('learning_command', { vaultPath: '/qa', libraryId: 'library', request: { kind: 'readNoteMemory', pageId: 'page' } })
  const request = { operationId: 'operation', pageId: 'page', expectedHash: 'before', expectedRevision: null, source: 'document' }
  await client.saveNoteMemory(request)
  expect(invoke).toHaveBeenLastCalledWith('learning_command', { vaultPath: '/qa', libraryId: 'library', request: { kind: 'saveNoteMemory', request } })
  const config = { operationId: 'configure', pageId: 'page', expectedHash: 'before', expectedRevision: 1, config: { version: 1 as const, enabled: true, back: { kind: 'inline' as const } } }
  await client.configureNoteMemory(config)
  expect(invoke).toHaveBeenLastCalledWith('learning_command', { vaultPath: '/qa', libraryId: 'library', request: { kind: 'configureNoteMemory', request: config } })
  await client.reconcileNoteMemory('page')
  expect(invoke).toHaveBeenLastCalledWith('learning_command', { vaultPath: '/qa', libraryId: 'library', request: { kind: 'reconcileNoteMemory', pageId: 'page' } })
  await client.resumeNoteMemory('operation')
  expect(invoke).toHaveBeenLastCalledWith('learning_command', { vaultPath: '/qa', libraryId: 'library', request: { kind: 'resumeNoteMemory', operationId: 'operation' } })
})
it('preserves pending/conflict outcomes and failures for the dirty-buffer controller', async () => {
  vi.mocked(invoke).mockResolvedValueOnce({ libraryId: 'library', schemaVersion: 5 }).mockResolvedValueOnce({ status: 'pending', problem: 'IO failure' }).mockResolvedValueOnce({ status: 'conflict' }).mockRejectedValueOnce(Error('Changed identity'))
  const client = await LearningClient.connect('/qa')
  expect(await client.resumeNoteMemory('op')).toMatchObject({ status: 'pending' })
  expect(await client.resumeNoteMemory('op')).toMatchObject({ status: 'conflict' })
  await expect(client.readNoteMemory('missing')).rejects.toThrow('Changed identity')
})

it('previews conversion without connecting or initializing a Library', async () => {
  vi.mocked(invoke).mockResolvedValue({ state: 'importRequired', libraryId: null, pages: [] })
  await LearningClient.previewNoteConversion('/unopened')
  expect(invoke).toHaveBeenCalledTimes(1)
  expect(invoke).toHaveBeenCalledWith('learning_command', { vaultPath: '/unopened', libraryId: null, request: { kind: 'previewNoteConversion' } })
  vi.mocked(invoke).mockResolvedValueOnce({ libraryId: 'existing', schemaVersion: 5 })
  const client = await LearningClient.connect('/existing')
  await client.previewNoteConversion()
  expect(invoke).toHaveBeenLastCalledWith('learning_command', { vaultPath: '/existing', libraryId: 'existing', request: { kind: 'previewNoteConversion' } })
})
