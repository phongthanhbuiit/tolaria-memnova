import { describe, expect, it, vi } from 'vitest'
import { NoteEditorDocument } from './noteEditorDocument'
import { parseNoteMemoryDocument } from './noteMemoryDocument'
import { patchNoteMemoryConfig } from './noteMemoryPatch'
import type { NoteMemoryConfig } from './noteMemoryConfig'

const header = '---\n_memnova_page_id: 11111111-1111-4111-8111-111111111111\n_memnova_learning_version: 1\n_memnova_learning_enabled: false\n_memnova_back_kind: inline\ncustom: 9007199254740999\n---\n'
const source = `${header}# Article\n\nA4 text\n<!-- FLASHCARD:BACK -->\n  Mnemonic ![image](attachments/ảnh.svg)\n`
const make = (raw = source) => new NoteEditorDocument('/library/a.md', raw)

describe('canonical note editor document', () => {
  it('projects both faces with the original header and retains the complete raw source', () => {
    const doc = make()
    expect(doc.getSnapshot().source).toBe(source)
    expect(doc.project()).toBe(`${header}# Article\n\nA4 text\n`)
    doc.select('back')
    expect(doc.project()).toBe(`${header}  Mnemonic ![image](attachments/ảnh.svg)\n`)
  })
  it('keeps a literal marker in an ordinary note unsplit', () => {
    const doc = make('# Ordinary\n<!-- FLASHCARD:BACK -->\nExample')
    expect(doc.getSnapshot().enabled).toBe(false)
    expect(doc.project()).toBe(doc.getSnapshot().source)
  })
  it('patches only the active face, preserving opaque metadata and the other face', () => {
    const doc = make(), original = parseNoteMemoryDocument(source)
    doc.edit('/library/a.md', `${header}# Changed`)
    expect(parseNoteMemoryDocument(doc.getSnapshot().source).back).toBe(original.back)
    doc.select('back')
    const prefix = doc.getSnapshot().source.split('  Mnemonic')[0]
    doc.edit('/library/a.md', `${header}New canvas\n`)
    expect(doc.getSnapshot().source).toBe(`${prefix}New canvas\n`)
  })
  it('preserves BOM, CRLF, and raw back bytes when editing the article', () => {
    const doc = make(`\ufeff${source.replaceAll('\n', '\r\n')}`)
    const back = parseNoteMemoryDocument(doc.getSnapshot().source).back
    doc.edit('/library/a.md', `\ufeff${header.replaceAll('\n', '\r\n')}# Edited`)
    expect(doc.getSnapshot().source.startsWith(`\ufeff${header.replaceAll('\n', '\r\n')}`)).toBe(true)
    expect(parseNoteMemoryDocument(doc.getSnapshot().source).back).toBe(back)
  })
  it('does not publish or create a canvas on open or a no-op edit', () => {
    const doc = make(), notify = vi.fn()
    doc.subscribe(notify)
    expect(doc.edit('/library/a.md', doc.project())).toBeNull()
    expect(notify).not.toHaveBeenCalled()
    expect(doc.getSnapshot().source).toBe(source)
  })
  it('merges synchronous flush and next-face edits against the latest complete document', () => {
    const doc = make()
    doc.edit('/library/a.md', `${header}Last front stroke`)
    doc.select('back')
    doc.edit('/library/a.md', `${header}Last back stroke`)
    expect(parseNoteMemoryDocument(doc.getSnapshot().source)).toMatchObject({ front: 'Last front stroke\n', back: 'Last back stroke' })
  })
  it('ignores delayed echoes of earlier local changes', () => {
    const doc = make()
    const older = doc.edit('/library/a.md', `${header}First`)!
    const latest = doc.edit('/library/a.md', `${header}Second`)!
    doc.receive(latest)
    doc.receive(older)
    expect(doc.getSnapshot().source).toBe(latest)
    expect(doc.getSnapshot().conflict).toBe(false)
  })
  it('retains a local draft when a different external edit arrives', () => {
    const doc = make(), draft = doc.edit('/library/a.md', `${header}My draft`)!
    doc.receive(source.replace('A4 text', 'External edit'))
    expect(doc.getSnapshot()).toMatchObject({ source: draft, conflict: true })
  })
  it('accepts external changes when no local edit is pending', () => {
    const doc = make(), external = source.replace('A4 text', 'External edit')
    doc.receive(external)
    expect(doc.getSnapshot()).toMatchObject({ source: external, face: 'front', conflict: false })
  })
  it('adds an empty mnemonic only on an explicit action, without enabling learning', () => {
    const doc = make(`${header}Article`)
    expect(doc.getSnapshot().hasBack).toBe(false)
    doc.addBack()
    expect(doc.getSnapshot()).toMatchObject({ hasBack: true, face: 'back' })
    expect(parseNoteMemoryDocument(doc.getSnapshot().source).config?.enabled).toBe(false)
  })
  it('rejects late writes from an old path or disposed editor visit', () => {
    const doc = make()
    expect(doc.edit('/library/b.md', 'Wrong page')).toBeNull()
    doc.deactivate()
    expect(doc.edit('/library/a.md', 'Late completion')).toBeNull()
    expect(doc.getSnapshot().source).toBe(source)
  })
  it('cannot edit a linked mnemonic through the owner document', () => {
    const doc = make(source.replace('_memnova_back_kind: inline', '_memnova_back_kind: page\n_memnova_back_page_id: 22222222-2222-4222-8222-222222222222\n_memnova_back_face: front'))
    doc.select('back')
    expect(doc.project()).not.toContain('Mnemonic ![image]')
    expect(() => doc.edit('/library/a.md', 'Overwrite linked source')).toThrow('linked-mnemonic-read-only')
  })
  it('stages its own configuration without replacing newer body changes or mistaking its native echo for a conflict', () => {
    const doc = make()
    doc.edit('/library/a.md', `${header}Newer unsaved article`)
    const config: NoteMemoryConfig = { version: 1, enabled: false, back: { kind: 'page', pageId: '22222222-2222-4222-8222-222222222222', face: 'front' } }
    const nativeSource = patchNoteMemoryConfig(source, config)
    const combined = doc.stageConfiguration(source, nativeSource, config)!
    expect(parseNoteMemoryDocument(combined)).toMatchObject({ front: 'Newer unsaved article\n', back: parseNoteMemoryDocument(source).back, config })
    doc.receive(nativeSource)
    doc.markSaved(nativeSource)
    expect(doc.getSnapshot()).toMatchObject({ source: combined, conflict: false, externalVersion: 0 })
    expect(doc.getBaseline()).toBe(nativeSource)
    doc.receive(nativeSource.replace('# Article', '# External'))
    expect(doc.getSnapshot()).toMatchObject({ source: combined, conflict: true })
  })
  it('keeps the local mnemonic bytes through inline to linked and back again', () => {
    const doc = make()
    const linked: NoteMemoryConfig = { version: 1, enabled: false, back: { kind: 'page', pageId: '22222222-2222-4222-8222-222222222222', face: 'back' } }
    const linkedSource = patchNoteMemoryConfig(source, linked)
    doc.stageConfiguration(source, linkedSource, linked)
    doc.markSaved(linkedSource)
    const inline: NoteMemoryConfig = { version: 1, enabled: false, back: { kind: 'inline' } }
    doc.stageConfiguration(linkedSource, source, inline)
    expect(doc.getSnapshot().source).toBe(source)
  })
})
