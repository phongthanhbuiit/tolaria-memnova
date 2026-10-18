import { joinVaultPath, notePathsMatch } from '../../utils/notePathIdentity'
import type { LearningClient } from './client'
import type { NoteWriteRequest } from './types'

type EditorMemoryClient = Pick<LearningClient, 'vaultPath' | 'readNoteMemory' | 'saveNoteMemory'>
interface PersistenceOptions {
  client: EditorMemoryClient
  path: string
  pageId: string
  source: string
  onSaved?: (source: string) => void
}

async function sourceHash(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

/** Serializes the existing autosave pipeline through immutable, retryable native intents. */
export class NoteEditorPersistence {
  private options: PersistenceOptions
  private source: string
  private revision: number | null | undefined
  private intent: NoteWriteRequest | null = null
  private queue: Promise<void> = Promise.resolve()
  private active = true
  private generation = 0

  constructor(options: PersistenceOptions) { this.options = options; this.source = options.source }
  activate(): void { this.active = true }
  deactivate(): void { this.active = false; this.generation++ }
  private current(generation: number): void {
    if (!this.active || generation !== this.generation) throw Error('stale-editor-visit')
  }

  save(source: string): Promise<void> {
    const generation = this.generation
    const execute = () => this.saveCurrent(source, generation)
    const result = this.queue.then(execute, execute)
    this.queue = result.catch(() => {})
    return result
  }

  private async prepare(source: string, generation: number): Promise<NoteWriteRequest> {
    const { client, pageId, path } = this.options
    const expectedHash = await sourceHash(this.source)
    if (this.revision === undefined) {
      const view = await client.readNoteMemory(pageId)
      if (view.pageId !== pageId || !notePathsMatch(joinVaultPath(client.vaultPath, view.path), path)) throw Error('note-editor-identity-changed')
      this.revision = view.binding?.revision ?? null
    }
    this.current(generation)
    return { operationId: crypto.randomUUID(), pageId, expectedHash, expectedRevision: this.revision, source }
  }

  private async commitIntent(generation: number): Promise<void> {
    const request = this.intent!
    this.current(generation)
    const receipt = await this.options.client.saveNoteMemory(request)
    this.current(generation)
    if (receipt.operationId !== request.operationId || receipt.pageId !== request.pageId) throw Error('invalid-note-write-receipt')
    if (receipt.status !== 'committed') throw Error(`note-write-${receipt.status}: ${receipt.problem ?? ''}`)
    if (receipt.sourceHash !== await sourceHash(request.source)) throw Error('invalid-note-write-receipt')
    this.source = request.source
    this.revision = receipt.revision
    this.intent = null
    this.options.onSaved?.(this.source)
  }

  private async saveCurrent(source: string, generation: number): Promise<void> {
    this.current(generation)
    if (this.intent) await this.commitIntent(generation)
    if (source === this.source) return
    this.intent = await this.prepare(source, generation)
    await this.commitIntent(generation)
  }
}

const writers = new Map<string, NoteEditorPersistence>()
export function registerNoteEditorPersistence(path: string, writer: NoteEditorPersistence): () => void {
  writers.set(path, writer)
  writer.activate()
  return () => {
    writer.deactivate()
    if (writers.get(path) === writer) writers.delete(path)
  }
}
export async function saveThroughNoteEditor(path: string, source: string): Promise<boolean> {
  const writer = writers.get(path)
  if (!writer) return false
  await writer.save(source)
  return true
}
