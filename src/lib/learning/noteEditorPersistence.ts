import { joinVaultPath, notePathsMatch, normalizeNotePathForIdentity } from '../../utils/notePathIdentity'
import type { LearningClient } from './client'
import type {
  NoteWriteRequest,
  NoteConfigureRequest,
  NoteWriteOutcome,
} from './types'
import type { NoteMemoryConfig } from './noteMemoryConfig'
import { patchNoteMemoryConfig } from './noteMemoryPatch'
import { patchNoteProperty, type NotePropertyValue } from './notePropertyPatch'

type EditorMemoryClient = Pick<
  LearningClient,
  'vaultPath' | 'readNoteMemory' | 'saveNoteMemory'
> &
  Partial<Pick<LearningClient, 'configureNoteMemory'>>
type EditorIntent =
  | { kind: 'save'; request: NoteWriteRequest; afterSource: string }
  | { kind: 'configure'; request: NoteConfigureRequest; afterSource: string }
interface PersistenceOptions {
  client: EditorMemoryClient
  path: string
  pageId: string
  source: string
  onSaved?: (source: string) => void
  getCurrentSource?: () => string
  onPropertyDraft?: (draft: { beforeSource: string; afterSource: string; key: string; value: NotePropertyValue | undefined; rememberOnly?: boolean }) => void
  onConfigurationDraft?: (draft: {
    beforeSource: string
    afterSource: string
    config: NoteMemoryConfig
    rememberOnly?: boolean
  }) => void
}

async function sourceHash(source: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(source)
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

/** Serializes the existing autosave pipeline through immutable, retryable native intents. */
export class NoteEditorPersistence {
  private options: PersistenceOptions
  private source: string
  private revision: number | null | undefined
  private intent: EditorIntent | null = null
  private queue: Promise<void> = Promise.resolve()
  private active = true
  private generation = 0

  constructor(options: PersistenceOptions) {
    this.options = options
    this.source = options.source
  }
  activate(): void {
    this.active = true
  }
  deactivate(): void {
    this.active = false
    this.generation++
  }
  hasPendingIntent(): boolean { return this.intent !== null }
  private current(generation: number): void {
    if (!this.active || generation !== this.generation)
      throw Error('stale-editor-visit')
  }

  save(source: string): Promise<void> {
    const generation = this.generation
    return this.enqueue(() => this.saveCurrent(source, generation))
  }

  configure(config: NoteMemoryConfig): Promise<void> {
    const generation = this.generation
    const configuration = structuredClone(config)
    return this.enqueueDraft(() => this.configureCurrent(configuration, generation), () => {
      this.current(generation)
      this.options.onConfigurationDraft?.({ beforeSource: this.source,
        afterSource: patchNoteMemoryConfig(this.source, configuration), config: configuration })
    })
  }

  property(key: string, value: NotePropertyValue | undefined): Promise<string> {
    const generation = this.generation
    const propertyValue = value === undefined ? undefined : structuredClone(value)
    return this.enqueueDraft(() => this.propertyCurrent(key, propertyValue, generation), () => {
      this.current(generation)
      const afterSource = patchNoteProperty(this.source, key, propertyValue)
      this.options.onPropertyDraft?.({ beforeSource: this.source, afterSource, key, value: propertyValue })
    })
  }

  private enqueue<T>(execute: () => Promise<T>): Promise<T> {
    const result = this.queue.then(execute, execute)
    this.queue = result.then(() => undefined, () => undefined)
    return result
  }

  private enqueueDraft<T>(execute: () => Promise<T>, stage: () => void): Promise<T> {
    let failure: { error: unknown } | null = null
    const result = this.enqueue(() => {
      if (failure) throw failure.error
      return execute()
    })
    // Stage synchronously, even while an earlier intent awaits its receipt. Any
    // subsequent autosave then captures the selected property/configuration.
    try { stage() } catch (error) { failure = { error } }
    return result
  }

  private async prepareBase(
    generation: number
  ): Promise<Pick<NoteWriteRequest, 'expectedHash' | 'expectedRevision'>> {
    const { client, pageId, path } = this.options
    const expectedHash = await sourceHash(this.source)
    if (this.revision === undefined) {
      const view = await client.readNoteMemory(pageId)
      if (
        view.pageId !== pageId ||
        !notePathsMatch(joinVaultPath(client.vaultPath, view.path), path)
      )
        throw Error('note-editor-identity-changed')
      this.revision = view.binding?.revision ?? null
    }
    this.current(generation)
    return { expectedHash, expectedRevision: this.revision }
  }

  private sendIntent(intent: EditorIntent): Promise<NoteWriteOutcome> {
    if (intent.kind === 'save')
      return this.options.client.saveNoteMemory(intent.request)
    if (!this.options.client.configureNoteMemory)
      throw Error('note-editor-configuration-unavailable')
    return this.options.client.configureNoteMemory(intent.request)
  }

  private async commitIntent(generation: number): Promise<void> {
    const intent = this.intent!,
      request = intent.request
    this.current(generation)
    const receipt = await this.sendIntent(intent)
    this.current(generation)
    if (
      receipt.operationId !== request.operationId ||
      receipt.pageId !== request.pageId
    )
      throw Error('invalid-note-write-receipt')
    if (receipt.status !== 'committed')
      throw Error(`note-write-${receipt.status}: ${receipt.problem ?? ''}`)
    if (receipt.sourceHash !== (await sourceHash(intent.afterSource)))
      throw Error('invalid-note-write-receipt')
    this.current(generation)
    this.source = intent.afterSource
    this.revision = receipt.revision
    this.intent = null
    this.options.onSaved?.(this.source)
  }

  private async saveCurrent(source: string, generation: number): Promise<void> {
    this.current(generation)
    if (this.intent) await this.commitIntent(generation)
    if (source === this.source) return
    const base = await this.prepareBase(generation)
    this.intent = {
      kind: 'save',
      request: {
        ...base,
        operationId: crypto.randomUUID(),
        pageId: this.options.pageId,
        source,
      },
      afterSource: source,
    }
    await this.commitIntent(generation)
  }

  private async propertyCurrent(key: string, value: NotePropertyValue | undefined, generation: number): Promise<string> {
    this.current(generation)
    if (this.intent) await this.commitIntent(generation)
    const beforeSource = this.source, afterSource = patchNoteProperty(beforeSource, key, value)
    if (beforeSource !== afterSource) {
      const base = await this.prepareBase(generation)
      this.intent = { kind: 'save', request: { ...base, operationId: crypto.randomUUID(), pageId: this.options.pageId, source: afterSource }, afterSource }
      this.options.onPropertyDraft?.({ beforeSource, afterSource, key, value, rememberOnly: true })
      await this.commitIntent(generation)
    }
    return this.options.getCurrentSource?.() ?? this.source
  }

  private async configureCurrent(
    config: NoteMemoryConfig,
    generation: number
  ): Promise<void> {
    this.current(generation)
    if (this.intent) await this.commitIntent(generation)
    const beforeSource = this.source,
      afterSource = patchNoteMemoryConfig(beforeSource, config)
    if (beforeSource === afterSource) return
    const base = await this.prepareBase(generation)
    this.intent = {
      kind: 'configure',
      request: {
        ...base,
        operationId: crypto.randomUUID(),
        pageId: this.options.pageId,
        config,
      },
      afterSource,
    }
    this.options.onConfigurationDraft?.({
      beforeSource,
      afterSource,
      config: structuredClone(config),
      rememberOnly: true,
    })
    await this.commitIntent(generation)
  }
}

const writers = new Map<string, NoteEditorPersistence>()
type WorkspacePropertyWriter = (path: string, key: string, value: NotePropertyValue | undefined) => Promise<string | null>
const workspacePropertyWriters = new Map<string, WorkspacePropertyWriter>()
export function registerNoteWorkspacePropertyWriter(root: string, writer: WorkspacePropertyWriter): () => void {
  const key = `${normalizeNotePathForIdentity(root)}/`
  workspacePropertyWriters.set(key, writer)
  return () => { if (workspacePropertyWriters.get(key) === writer) workspacePropertyWriters.delete(key) }
}
export function getNoteEditorPersistence(path: string): NoteEditorPersistence | null {
  return writers.get(path) ?? null
}
export function registerNoteEditorPersistence(
  path: string,
  writer: NoteEditorPersistence
): () => void {
  writers.set(path, writer)
  writer.activate()
  return () => {
    writer.deactivate()
    if (writers.get(path) === writer) writers.delete(path)
  }
}
export async function saveThroughNoteEditor(
  path: string,
  source: string
): Promise<boolean> {
  const writer = writers.get(path)
  if (!writer) return false
  await writer.save(source)
  return true
}
export async function configureThroughNoteEditor(
  path: string,
  config: NoteMemoryConfig
): Promise<boolean> {
  const writer = writers.get(path)
  if (!writer) return false
  await writer.configure(config)
  return true
}

export async function propertyThroughNoteEditor(path: string, key: string, value: NotePropertyValue | undefined): Promise<string | null> {
  const writer = writers.get(path)
  if (writer) return writer.property(key, value)
  const normalized = normalizeNotePathForIdentity(path)
  const owner = [...workspacePropertyWriters].filter(([prefix]) => normalized.startsWith(prefix)).sort(([left], [right]) => right.length - left.length)[0]?.[1]
  return owner ? owner(path, key, value) : null
}
