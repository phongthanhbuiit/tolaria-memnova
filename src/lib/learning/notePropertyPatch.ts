import {
  canonicalFrontmatterWriteKey,
  frontmatterKeysMatch,
} from '../../utils/systemMetadata'
import { memoryHeader, memoryLines, type MemoryLine } from './noteMemoryLines'

export type NotePropertyValue = string | number | boolean | string[] | null
export function validateNotePropertyKey(key: string): void {
  const normalized = key.trim().toLowerCase()
  if (
    !key ||
    key.trim() !== key ||
    /[\r\n\0]/.test(key) ||
    normalized.startsWith('_memnova_') ||
    normalized.startsWith('_fsrs_')
  ) {
    throw Error('reserved-or-invalid-note-property')
  }
}
function propertyName(line: MemoryLine): string | null {
  const match = line.text.match(
    /^("(?:\\.|[^"])*"|'(?:''|[^'])*'|[^\s#][^:]*):/
  )
  if (!match) return null
  const raw = match[1]
  if (raw.startsWith('"')) {
    try {
      const key: unknown = JSON.parse(raw)
      return typeof key === 'string' ? key : null
    } catch {
      return null
    }
  }
  return raw.replace(/^'|'$/g, '').replace(/''/g, "'").trim()
}
function field(key: string, value: NotePropertyValue, eol: string): string {
  const writeKey = canonicalFrontmatterWriteKey(key)
  const name = /^[A-Za-z_][A-Za-z0-9_-]*$/.test(writeKey)
    ? writeKey
    : JSON.stringify(writeKey)
  if (typeof value === 'number' && !Number.isFinite(value))
    throw Error('invalid-property-number')
  if (Array.isArray(value) && value.length)
    return `${name}:${eol}${value.map((item) => `  - ${JSON.stringify(item)}${eol}`).join('')}`
  return `${name}: ${JSON.stringify(value)}${eol}`
}

/** Patch one top-level field; opaque YAML and both Markdown faces stay verbatim. */
export function patchNoteProperty(
  source: string,
  key: string,
  value: NotePropertyValue | undefined
): string {
  validateNotePropertyKey(key)
  const lines = memoryLines(source),
    header = memoryHeader(lines)
  if (header === 'unclosed') throw Error('unclosed-frontmatter')
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const replacement = value === undefined ? '' : field(key, value, eol)
  if (!header) {
    if (value === undefined) return source
    const bom = source.startsWith('\ufeff') ? '\ufeff' : ''
    return `${bom}---${eol}${replacement}---${eol}${source.slice(bom.length)}`
  }
  const metadata = lines.filter(
    (line) =>
      line.start >= header.contentStart && line.start < header.contentEnd
  )
  const output: string[] = []
  let found = false
  for (let index = 0; index < metadata.length; index++) {
    const line = metadata[index],
      name = propertyName(line)
    if (name === null || !frontmatterKeysMatch(name, key)) {
      output.push(source.slice(line.start, line.end))
      continue
    }
    if (!found) output.push(replacement)
    found = true
    while (
      index + 1 < metadata.length &&
      /^(?:[ \t]|$)/.test(metadata[index + 1].text)
    )
      index++
  }
  if (!found) output.push(replacement)
  return (
    source.slice(0, header.contentStart) +
    output.join('') +
    source.slice(header.contentEnd)
  )
}
