import type { MemoryFace, NoteMemoryConfig } from './noteMemoryConfig'
import { parseNoteMemoryDocument } from './noteMemoryDocument'
import { patchNoteMemoryConfig, patchNoteMemoryFace } from './noteMemoryPatch'

interface EditorSnapshot {
  source: string
  face: MemoryFace
  enabled: boolean
  hasBack: boolean
  linked: boolean
  conflict: boolean
  externalVersion: number
}

function snapshot(source: string, face: MemoryFace = 'front', conflict = false, externalVersion = 0): EditorSnapshot {
  const doc = parseNoteMemoryDocument(source)
  const enabled = Boolean(doc.config && !doc.issues.length)
  const linked = enabled && doc.config?.back.kind === 'page'
  return { source, face, enabled, hasBack: Boolean(doc.offsets.back) || linked, linked, conflict, externalVersion }
}

/** One complete source per editor visit; face projections never become the saved document. */
export class NoteEditorDocument {
  readonly path: string
  private state: EditorSnapshot
  private listeners = new Set<() => void>()
  private echoes = new Set<string>()
  private dirty = false
  private active = true
  private baseline: string

  constructor(path: string, source: string) {
    this.path = path
    this.baseline = source
    this.state = snapshot(source)
  }

  getSnapshot = (): EditorSnapshot => this.state
  getBaseline = (): string => this.baseline
  isActive = (): boolean => this.active
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  activate = (): void => { this.active = true }
  deactivate = (): void => { this.active = false }

  private publish(next: EditorSnapshot): void {
    this.state = next
    this.listeners.forEach(listener => listener())
  }

  private local(source: string): string | null {
    if (!this.active || source === this.state.source) return null
    this.remember(source)
    this.dirty = true
    this.publish(snapshot(source, this.state.face, this.state.conflict, this.state.externalVersion))
    return source
  }

  private remember(source: string): void {
    this.echoes.add(source)
    if (this.echoes.size > 32) this.echoes.delete(this.echoes.values().next().value!)
  }

  stageConfiguration(beforeSource: string, afterSource: string, config: NoteMemoryConfig): string | null {
    if (!this.active) return null
    this.remember(beforeSource)
    this.remember(afterSource)
    return this.local(patchNoteMemoryConfig(this.state.source, config))
  }

  receive(source: string): void {
    if (source === this.state.source || this.echoes.has(source)) return
    if (this.dirty) {
      if (!this.state.conflict) this.publish({ ...this.state, conflict: true })
      return
    }
    this.baseline = source
    this.publish(snapshot(source, this.state.face, false, this.state.externalVersion + 1))
  }

  markSaved(source: string): void {
    this.baseline = source
    if (source === this.state.source) this.dirty = false
  }

  project(): string {
    if (!this.state.enabled) return this.state.source
    const doc = parseNoteMemoryDocument(this.state.source)
    const body = this.state.face === 'back' && this.state.linked ? '' : doc[this.state.face]
    return this.state.source.slice(0, doc.offsets.front.start) + body
  }

  select(face: MemoryFace): void {
    if (this.active && face !== this.state.face) this.publish({ ...this.state, face })
  }

  edit(path: string, projectedSource: string): string | null {
    if (!this.active || path !== this.path || projectedSource === this.project()) return null
    if (!this.state.enabled) return this.local(projectedSource)
    if (this.state.face === 'back' && this.state.linked) throw Error('linked-mnemonic-read-only')
    const projected = parseNoteMemoryDocument(projectedSource)
    const body = projectedSource.slice(projected.offsets.front.start)
    return this.local(patchNoteMemoryFace(this.state.source, this.state.face, body))
  }

  editRaw(path: string, source: string): string | null {
    return path === this.path ? this.local(source) : null
  }

  addBack(): string | null {
    if (!this.active || !this.state.enabled || this.state.hasBack) return null
    const changed = this.local(patchNoteMemoryFace(this.state.source, 'back', '', true))
    this.select('back')
    return changed
  }
}
