import { memoryConfigKeys, memoryConfigValues, memoryScalar, type MemoryFace, type NoteMemoryConfig } from './noteMemoryConfig'
import { parseNoteMemoryDocument, type NoteMemoryDocument } from './noteMemoryDocument'
import { MEMORY_BACK_MARKER, memoryLines } from './noteMemoryLines'

function editableDocument(source: string) {
  const document = parseNoteMemoryDocument(source)
  if (document.issues.length) throw new Error(document.issues.join(', '))
  return document
}

function appendBack(source: string, content: string, newline: string): string {
  const next = `${source}${source.endsWith('\n') ? newline : newline + newline}${MEMORY_BACK_MARKER}${newline}${content}`
  if (!editableDocument(next).offsets.marker) throw new Error('invalid-face-boundary')
  return next
}

function replaceFace(source: string, document: NoteMemoryDocument, face: MemoryFace, content: string, newline: string): string {
  const range = document.offsets[face]!
  const suffix = face === 'front' && document.offsets.marker && content && !content.endsWith('\n') ? newline : ''
  const next = source.slice(0, range.start) + content + suffix + source.slice(range.end)
  const parsed = editableDocument(next)
  if (face === 'front' && Boolean(document.offsets.marker) !== Boolean(parsed.offsets.marker)) throw new Error('invalid-face-boundary')
  return next
}

export function patchNoteMemoryFace(source: string, face: MemoryFace, content: string, createBack = false): string {
  const document = editableDocument(source)
  if (document[face] === content && !(createBack && !document.offsets.back)) return source
  const newline = source.includes('\r\n') ? '\r\n' : '\n'
  return face === 'back' && !document.offsets.back
    ? appendBack(source, content, newline)
    : replaceFace(source, document, face, content, newline)
}

function patchHeader(source: string, config: NoteMemoryConfig, newline: string): string {
  const values = memoryConfigValues(config)
  const replaced = memoryLines(source).map(line => {
    const key = line.text.match(/^(_memnova_\w+):/)?.[1]
    if (!key || !memoryConfigKeys.some(owned => owned === key)) return source.slice(line.start, line.end)
    const value = values.get(key)
    values.delete(key)
    if (value === undefined) return ''
    const current = memoryScalar(line.text.slice(key.length + 1))
    if ((key === '_memnova_back_page_id' ? current.toLowerCase() : current) === value) return source.slice(line.start, line.end)
    const ending = source.slice(line.start + line.text.length, line.end)
    const comment = line.text.match(/\s+#.*$/)?.[0] ?? ''
    return `${key}: ${value}${comment}${ending}`
  }).join('')
  return replaced + [...values].map(([key, value]) => `${key}: ${value}${newline}`).join('')
}

export function patchNoteMemoryConfig(source: string, config: NoteMemoryConfig): string {
  if (config.version !== 1 || typeof config.enabled !== 'boolean') throw new Error('invalid-config')
  const document = editableDocument(source)
  const wanted = memoryConfigValues(config)
  const current = document.config && memoryConfigValues(document.config)
  if (current?.size === wanted.size && [...wanted].every(([key, value]) => current.get(key) === value)) return source
  const newline = source.includes('\r\n') ? '\r\n' : '\n'
  let next: string
  if (document.header) {
    const { contentStart, contentEnd } = document.header
    next = source.slice(0, contentStart) + patchHeader(source.slice(contentStart, contentEnd), config, newline) + source.slice(contentEnd)
  } else {
    const prefix = source.startsWith('\ufeff') ? '\ufeff' : ''
    next = `${prefix}---${newline}${patchHeader('', config, newline)}---${newline}${source.slice(prefix.length)}`
  }
  if (parseNoteMemoryDocument(next).issues.length) throw new Error('invalid-config')
  return next
}
