import type { LearningClient } from './client'
import {
  getNoteEditorPersistence,
  NoteEditorPersistence,
} from './noteEditorPersistence'
import { parseNoteMemoryDocument } from './noteMemoryDocument'
import { registerSelectedSource } from './sourceSelection'
import type { NotePropertyValue } from './notePropertyPatch'
import { normalizeNotePathForIdentity } from '../../utils/notePathIdentity'

interface Options {
  client: LearningClient
  read: (path: string) => Promise<string>
  flush: (path: string) => Promise<unknown>
  onSaved: (path: string, before: string, after: string) => void
  owns?: (path: string) => boolean
}
type CachedWriter = { writer: NoteEditorPersistence; source: string }

/** Inactive mutations reuse the canonical editor coordinator, including uncertain receipts. */
export class NoteWorkspaceMutations {
  private active = true
  private writers = new Map<string, CachedWriter>()
  private options: Options
  constructor(options: Options) {
    this.options = options
  }
  dispose(): void {
    this.active = false
    for (const cached of this.writers.values()) cached.writer.deactivate()
    this.writers.clear()
  }
  private current(): void {
    if (!this.active) throw Error('stale-note-workspace')
  }
  private relative(path: string): string {
    const prefix = `${normalizeNotePathForIdentity(this.options.client.vaultPath)}/`
    const normalized = normalizeNotePathForIdentity(path)
    if (!normalized.startsWith(prefix)) throw Error('note-outside-library')
    const relative = normalized.slice(prefix.length)
    if (
      !relative ||
      relative.split('/').some((part) => part === '.' || part === '..')
    )
      throw Error('note-outside-library')
    return relative
  }
  private async load(path: string): Promise<string> {
    this.current()
    this.relative(path)
    await this.options.flush(path)
    this.current()
    const source = await this.options.read(path)
    this.current()
    return source
  }
  private writer(
    path: string,
    pageId: string,
    source: string
  ): NoteEditorPersistence {
    const registered = getNoteEditorPersistence(path)
    if (registered) return registered
    const cached = this.writers.get(path)
    if (
      cached &&
      (cached.source === source || cached.writer.hasPendingIntent())
    )
      return cached.writer
    cached?.writer.deactivate()
    const next: CachedWriter = {
      source,
      writer: new NoteEditorPersistence({
        client: this.options.client,
        path,
        pageId,
        source,
        onSaved: (after) => {
          this.current()
          const before = next.source
          next.source = after
          this.options.onSaved(path, before, after)
        },
      }),
    }
    this.writers.set(path, next)
    return next.writer
  }
  async property(
    path: string,
    key: string,
    value: NotePropertyValue | undefined
  ): Promise<string | null> {
    const source = await this.load(path),
      parsed = parseNoteMemoryDocument(source)
    const managed = Boolean(
      parsed.config ||
        this.options.owns?.(path) ||
        /(?:^|\n)_memnova_learning_/.test(source)
    )
    if (!managed) return null
    if (!parsed.pageId || parsed.issues.length)
      throw Error('invalid-note-configuration')
    return this.writer(path, parsed.pageId, source).property(key, value)
  }
  async setEnabled(path: string, enabled: boolean): Promise<void> {
    let source = await this.load(path),
      parsed = parseNoteMemoryDocument(source)
    if (parsed.issues.length) throw Error('invalid-note-configuration')
    if (!parsed.pageId) {
      if (!enabled) return
      const selected = await this.options.client.previewNoteSource(
        this.relative(path),
        'front'
      )
      this.current()
      await registerSelectedSource(
        this.options.client,
        selected,
        () => this.active
      )
      this.current()
      const registered = await this.options.read(path)
      this.current()
      this.options.onSaved(path, source, registered)
      source = registered
      parsed = parseNoteMemoryDocument(source)
    }
    if (!parsed.pageId) throw Error('missing-note-identity')
    const view = await this.options.client.readNoteMemory(parsed.pageId)
    this.current()
    const ownPending =
      this.writers.get(path)?.writer.hasPendingIntent() ||
      getNoteEditorPersistence(path)?.hasPendingIntent()
    if (view.state === 'pending' && !ownPending)
      throw Error('note-recovery-required')
    if (view.legacyCardCount && !view.binding)
      throw Error('note-conversion-required')
    await this.writer(path, parsed.pageId, source).configure({
      version: 1,
      enabled,
      back: parsed.config?.back ?? { kind: 'inline' },
    })
    this.current()
  }
}
