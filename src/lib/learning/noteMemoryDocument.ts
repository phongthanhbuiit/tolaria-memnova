import { memoryBoundaries, memoryHeader, memoryLines, type MemoryHeader, type MemoryLine } from './noteMemoryLines'
import { readMemoryConfig, type MemoryIssue, type NoteMemoryConfig } from './noteMemoryConfig'

export interface MemoryRange { start: number; end: number }
export interface NoteMemoryDocument {
  front: string
  back: string
  config: NoteMemoryConfig | null
  pageId: string | null
  issues: MemoryIssue[]
  ranges: { front: MemoryRange; back: MemoryRange | null; marker: MemoryRange | null }
  /** Character offsets are private to the JavaScript patcher; ranges above are UTF-8 bytes. */
  offsets: { front: MemoryRange; back: MemoryRange | null; marker: MemoryRange | null }
  header: MemoryHeader | null
}

function byteRange(source: string, range: MemoryRange | null): MemoryRange | null {
  if (!range) return null
  const encoder = new TextEncoder()
  return { start: encoder.encode(source.slice(0, range.start)).length, end: encoder.encode(source.slice(0, range.end)).length }
}

function projectFaces(source: string, bodyStart: number, boundary: MemoryLine | null) {
  const offsets: NoteMemoryDocument['offsets'] = {
    front: { start: bodyStart, end: source.length }, back: null, marker: null,
  }
  if (boundary) {
    offsets.front.end = boundary.start
    offsets.back = { start: boundary.end, end: source.length }
    offsets.marker = { start: boundary.start, end: boundary.end }
  }
  return {
    front: source.slice(offsets.front.start, offsets.front.end),
    back: offsets.back ? source.slice(offsets.back.start) : '',
    offsets,
    ranges: { front: byteRange(source, offsets.front)!, back: byteRange(source, offsets.back), marker: byteRange(source, offsets.marker) },
  }
}

export function parseNoteMemoryDocument(source: string): NoteMemoryDocument {
  const lines = memoryLines(source)
  const header = memoryHeader(lines)
  const bodyStart = header === 'unclosed' ? 0 : header?.bodyStart ?? (source.startsWith('\ufeff') ? 1 : 0)
  const metadata = readMemoryConfig(header && header !== 'unclosed' ? lines.filter(line => line.start >= header.contentStart && line.start < header.contentEnd) : [])
  const bodyLines = memoryLines(source.slice(bodyStart)).map(line => ({ ...line, start: line.start + bodyStart, end: line.end + bodyStart }))
  const boundaries = header === 'unclosed' ? [] : memoryBoundaries(bodyLines)
  const issues = [...metadata.issues]
  if (header === 'unclosed') issues.push('unclosed-frontmatter')
  if (boundaries.length > 1) issues.push('ambiguous-back-marker')
  const boundary = boundaries.length === 1 ? boundaries[0] : null
  return {
    ...projectFaces(source, bodyStart, boundary),
    config: metadata.config,
    pageId: metadata.pageId,
    issues,
    header: header === 'unclosed' ? null : header,
  }
}
