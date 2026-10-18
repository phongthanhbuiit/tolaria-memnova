import { NoteEditorDocument } from './noteEditorDocument'
import { describe, expect, it, vi } from 'vitest'
import { NoteEditorPersistence, registerNoteEditorPersistence, saveThroughNoteEditor } from './noteEditorPersistence'
import type { NoteConfigureRequest, NoteMemoryView, NoteWriteRequest, NoteWriteOutcome } from './types'
import { patchNoteMemoryConfig } from './noteMemoryPatch'
import type { NoteMemoryConfig } from './noteMemoryConfig'

const pageId = '11111111-1111-4111-8111-111111111111'
const baseline = 'Original article\n<!-- FLASHCARD:BACK -->\nOriginal mnemonic'
const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))), byte=>byte.toString(16).padStart(2,'0')).join('')
function fixture() {
  let revision = 4
  let currentSource = baseline
  const readNoteMemory = vi.fn(async () => ({ pageId, path: 'a.md', sourceHash: await sha256(baseline), binding: { pageId, cardId: 'card', sourceHash: await sha256(baseline), revision } }) as NoteMemoryView)
  const saveNoteMemory = vi.fn(async (request: NoteWriteRequest): Promise<NoteWriteOutcome> => { currentSource = request.source; return { operationId: request.operationId, pageId, status: 'committed', sourceHash: await sha256(request.source), revision: ++revision, problem: null } })
  const configureNoteMemory = vi.fn(async (request: NoteConfigureRequest): Promise<NoteWriteOutcome> => { currentSource = patchNoteMemoryConfig(currentSource, request.config); return {operationId:request.operationId,pageId,status:'committed',sourceHash:await sha256(currentSource),revision:++revision,problem:null} })
  const client = { vaultPath: '/library', readNoteMemory, saveNoteMemory, configureNoteMemory }
  const saved = vi.fn()
  const drafted = vi.fn()
  const writer = new NoteEditorPersistence({ client, path: '/library/a.md', pageId, source: baseline, onSaved: saved, onConfigurationDraft: drafted })
  return { writer, client, saved, drafted }
}

describe('note editor persistence coordinator', () => {
  it('uses the loaded source hash and nullable binding revision, then advances only after a committed receipt', async () => {
    const { writer, client, saved } = fixture()
    await writer.save('Edited article')
    await writer.save('Edited again')
    expect(client.saveNoteMemory.mock.calls[0][0]).toMatchObject({ pageId, expectedHash: await sha256(baseline), expectedRevision: 4, source: 'Edited article' })
    expect(client.saveNoteMemory.mock.calls[1][0]).toMatchObject({ expectedHash: await sha256('Edited article'), expectedRevision: 5 })
    expect(saved.mock.calls).toEqual([['Edited article'], ['Edited again']])
  })
  it('never substitutes a later disk hash for the content originally loaded into the editor', async () => {
    const { writer, client } = fixture()
    client.readNoteMemory.mockResolvedValue({ pageId, path: 'a.md', sourceHash: 'f'.repeat(64), binding: null } as NoteMemoryView)
    await writer.save('My local draft')
    expect(client.saveNoteMemory.mock.calls[0][0]).toMatchObject({ expectedHash: await sha256(baseline), expectedRevision: null })
  })
  it('retries the identical uncertain operation before saving a newer draft', async () => {
    const { writer, client } = fixture()
    client.saveNoteMemory.mockRejectedValueOnce(Error('Connection interrupted after native write'))
    await expect(writer.save('First draft')).rejects.toThrow('Connection interrupted')
    const intent = client.saveNoteMemory.mock.calls[0][0]
    await writer.save('Newer draft')
    expect(client.saveNoteMemory.mock.calls[1][0]).toEqual(intent)
    expect(client.saveNoteMemory.mock.calls[2][0]).toMatchObject({ source: 'Newer draft', expectedHash: await sha256('First draft') })
    expect(client.saveNoteMemory.mock.calls[2][0].operationId).not.toBe(intent.operationId)
  })
  for (const status of ['pending', 'conflict', 'discarded'] as const) it(`keeps a ${status} draft unsaved and does not start another operation`, async () => {
    const { writer, client, saved } = fixture()
    client.saveNoteMemory.mockImplementation(async request => ({ operationId: request.operationId, pageId, status, sourceHash: 'c'.repeat(64), revision: 4, problem: 'Needs recovery' }))
    await expect(writer.save('Local draft')).rejects.toThrow(status)
    await expect(writer.save('Newer draft')).rejects.toThrow(status)
    expect(client.saveNoteMemory.mock.calls[1][0]).toEqual(client.saveNoteMemory.mock.calls[0][0])
    expect(saved).not.toHaveBeenCalled()
  })
  it('serializes concurrent saves using the preceding committed revision', async () => {
    const { writer, client } = fixture()
    await Promise.all([writer.save('One'), writer.save('Two')])
    expect(client.saveNoteMemory.mock.calls.map(([request]) => request.expectedRevision)).toEqual([4, 5])
  })
  it('does not create journal rows for a no-op', async () => {
    const { writer, client } = fixture()
    await writer.save(baseline)
    expect(client.readNoteMemory).not.toHaveBeenCalled()
    expect(client.saveNoteMemory).not.toHaveBeenCalled()
  })
  it('rejects a late visit before calling the write IPC', async () => {
    const { writer, client } = fixture()
    writer.deactivate()
    await expect(writer.save('Late draft')).rejects.toThrow('stale-editor-visit')
    expect(client.saveNoteMemory).not.toHaveBeenCalled()
  })
  it('does not let cleanup of an old registration remove its replacement', async () => {
    const first = fixture(), second = fixture()
    const disposeFirst = registerNoteEditorPersistence('/library/a.md', first.writer)
    const disposeSecond = registerNoteEditorPersistence('/library/a.md', second.writer)
    disposeFirst()
    expect(await saveThroughNoteEditor('/library/a.md', 'Current draft')).toBe(true)
    expect(first.client.saveNoteMemory).not.toHaveBeenCalled()
    expect(second.client.saveNoteMemory).toHaveBeenCalledOnce()
    disposeSecond()
    expect(await saveThroughNoteEditor('/library/a.md', 'No owner')).toBe(false)
  })
})

describe('configuration shares the editor write queue', () => {
  const config: NoteMemoryConfig = {version:1,enabled:false,back:{kind:'page',pageId:'22222222-2222-4222-8222-222222222222',face:'front'}}
  it('stages a local draft, commits config, then saves newer body content with its receipt revision', async () => {
    const {writer,client,drafted,saved}=fixture()
    const configured=patchNoteMemoryConfig(baseline,config)
    const newer=configured.replace('Original article','New last stroke')
    await Promise.all([writer.configure(config),writer.save(newer)])
    expect(drafted).toHaveBeenCalledWith({beforeSource:baseline,afterSource:configured,config})
    expect(client.configureNoteMemory.mock.calls[0][0]).toMatchObject({expectedHash:await sha256(baseline),expectedRevision:4,config})
    expect(client.saveNoteMemory.mock.calls[0][0]).toMatchObject({expectedHash:await sha256(configured),expectedRevision:5,source:newer})
    expect(saved.mock.calls).toEqual([[configured],[newer]])
  })
  it('freezes a config before waiting in the queue',async()=>{
    const {writer,client}=fixture(), draft=structuredClone(config)
    const pending=writer.configure(draft)
    draft.back={kind:'inline'}
    await pending
    expect(client.configureNoteMemory.mock.calls[0][0].config).toEqual(config)
  })
  it('replays an uncertain config before a newer save and never converts it into a generic source operation',async()=>{
    const {writer,client}=fixture()
    client.configureNoteMemory.mockRejectedValueOnce(Error('Interrupted config response'))
    await expect(writer.configure(config)).rejects.toThrow('Interrupted')
    const first=client.configureNoteMemory.mock.calls[0][0]
    const newer=patchNoteMemoryConfig(baseline,config).replace('Original article','New body')
    await writer.save(newer)
    expect(client.configureNoteMemory.mock.calls[1][0]).toEqual(first)
    expect(client.saveNoteMemory.mock.calls[0][0]).toMatchObject({source:newer,expectedRevision:5})
  })
  for(const status of ['pending','conflict','discarded'] as const) it(`keeps ${status} config intents pending instead of saving a newer draft`,async()=>{
    const {writer,client,saved}=fixture()
    client.configureNoteMemory.mockImplementation(async request=>({operationId:request.operationId,pageId,status,sourceHash:'c'.repeat(64),revision:4,problem:'Needs recovery'}))
    await expect(writer.configure(config)).rejects.toThrow(status)
    await expect(writer.save('Newer draft')).rejects.toThrow(status)
    expect(client.configureNoteMemory.mock.calls[1][0]).toEqual(client.configureNoteMemory.mock.calls[0][0])
    expect(client.saveNoteMemory).not.toHaveBeenCalled()
    expect(saved).not.toHaveBeenCalled()
  })
  it('does not create a second config intent for a no-op retry after success',async()=>{
    const {writer,client}=fixture()
    await writer.configure(config)
    await writer.configure(config)
    expect(client.configureNoteMemory).toHaveBeenCalledOnce()
  })
})

it('stages a configuration before a previous queued save returns so new edits cannot capture the old configuration', async () => {
  const { writer, client, drafted } = fixture()
  const original = client.saveNoteMemory.getMockImplementation()!
  let release!: () => void
  const response = new Promise<void>(resolve => { release = resolve })
  client.saveNoteMemory.mockImplementationOnce(async request => { await response; return original(request) })
  const first = writer.save('First unsaved article')
  await vi.waitFor(() => expect(client.saveNoteMemory).toHaveBeenCalledOnce())
  const config: NoteMemoryConfig = { version: 1, enabled: false, back: { kind: 'inline' } }
  const configured = writer.configure(config)
  const stagedBeforeResponse = drafted.mock.calls.length
  release()
  await Promise.all([first, configured])
  expect(stagedBeforeResponse).toBe(1)
})

it('does not let an older property intent overwrite a newer choice captured by autosave', async () => {
  const document = new NoteEditorDocument('/library/a.md', baseline)
  let release!: () => void
  const response = new Promise<void>(resolve => { release = resolve })
  let revision = 4
  const saveNoteMemory = vi.fn(async (request: NoteWriteRequest) => {
    if (revision === 4) await response
    return { operationId: request.operationId, pageId, status: 'committed' as const, sourceHash: await sha256(request.source), revision: ++revision, problem: null }
  })
  const client = { vaultPath: '/library', saveNoteMemory, readNoteMemory: vi.fn(async () => ({ pageId, path: 'a.md', binding: { revision: 4 } }) as NoteMemoryView) }
  const writer = new NoteEditorPersistence({ client, path: '/library/a.md', pageId, source: baseline,
    getCurrentSource: () => document.getSnapshot().source,
    onPropertyDraft: draft => { document.stageProperty(draft.beforeSource, draft.afterSource, draft.key, draft.value, draft.rememberOnly) },
    onSaved: source => document.markSaved(source) })
  const first = writer.property('Status', 'First'), second = writer.property('Status', 'Second')
  await vi.waitFor(() => expect(saveNoteMemory).toHaveBeenCalledOnce())
  const autosave = writer.save(document.getSnapshot().source)
  release()
  await Promise.all([first, second, autosave])
  expect(saveNoteMemory.mock.calls.at(-1)![0].source).toContain('Status: "Second"')
})

it('never writes when a property draft cannot be staged in its editor', async () => {
  const { client } = fixture()
  const writer = new NoteEditorPersistence({ client, path: '/library/a.md', pageId, source: baseline, onPropertyDraft: () => { throw Error('Editor unavailable') } })
  await expect(writer.property('Status', 'Done')).rejects.toThrow('Editor unavailable')
  expect(client.saveNoteMemory).not.toHaveBeenCalled()
})
