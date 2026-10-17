import { splitFrontmatter } from '../../utils/wikilinks'
import {
  canonicalFrontmatterKey,
  isSystemMetadataKey,
} from '../../utils/systemMetadata'
import { propertyKey, type PropertyValues } from './propertyValues'
const dedicated = new Set([
  'type',
  'is_a',
  'is a',
  'workspace',
  'aliases',
  'title',
  'archived',
  'archived_at',
])
export function pagePropertyKey(
  key: string,
  values: PropertyValues,
  oldKey?: string,
) {
  propertyKey(key)
  const canonical = canonicalFrontmatterKey(key)
  if (
    (oldKey !== undefined &&
      key !== oldKey &&
      canonicalFrontmatterKey(oldKey) === canonical) ||
    dedicated.has(canonical) ||
    isSystemMetadataKey(key) ||
    Object.keys(values).some(
      (existing) =>
        existing !== oldKey && canonicalFrontmatterKey(existing) === canonical,
    )
  )
    throw Error('Reserved or duplicate page property')
}
const keyValueLine = /^("(?:\\.|[^"])*"|'(?:''|[^'])*'|[^\s#][^:]*):\s*(.*)$/
function readKey(raw: string): string {
  if (raw.startsWith('"')) {
    try {
      const key: unknown = JSON.parse(raw)
      if (typeof key === 'string') return key
    } catch {
      return raw
    }
  }
  return raw.replace(/^'|'$/g, '').replace(/''/g, "'").trim()
}
function lineValue(line: string): string {
  return line.match(keyValueLine)?.[2] ?? ''
}
function unsupported(lines: string[]): boolean {
  const value = lineValue(lines[0])
  if (/^[{&*!|>#]/.test(value)) return true
  if (value.startsWith('"')) {
    try {
      if (typeof JSON.parse(value) !== 'string') return true
    } catch {
      return true
    }
  } else if (value.startsWith("'")) {
    if (!value.endsWith("'")) return true
  } else if (/\s#/.test(value)) return true
  if (
    /^[+-]?\d/.test(value) &&
    Number.isInteger(Number(value)) &&
    !Number.isSafeInteger(Number(value))
  )
    return true
  if (value.startsWith('[') && !value.startsWith('[[')) {
    try {
      const parsed: unknown = JSON.parse(value)
      if (
        !Array.isArray(parsed) ||
        !parsed.every((item) => typeof item === 'string')
      )
        return value.trim() !== '[]'
    } catch {
      return true
    }
  }
  return lines
    .slice(1)
    .some(
      (line) =>
        /^\s+[^#\s-][^:]*:/.test(line) ||
        /^\s+-\s+[^:]+:/.test(line) ||
        /^\s+-\s+(?:true|false|null|~|[+-]?\d[\d.eE+-]*|\[.*|\{.*)\s*$/.test(
          line,
        ),
    )
}
/** Protect unsupported YAML blocks instead of treating the flat parser as a YAML object parser. */
export function pagePropertySnapshot(
  values: PropertyValues,
  content: string | null,
): PropertyValues {
  const frontmatter = splitFrontmatter(content ?? '')[0]
  if (!frontmatter)
    return Object.fromEntries(
      Object.entries(values).filter(
        ([key]) =>
          !dedicated.has(canonicalFrontmatterKey(key)) &&
          !isSystemMetadataKey(key) &&
          !key.startsWith('_'),
      ),
    )
  const groups: { key: string; lines: string[] }[] = []
  const lines = frontmatter.trimEnd().split(/\r?\n/).slice(1, -1)
  for (const line of lines) {
    const match = line.match(keyValueLine)
    if (match) {
      groups.push({
        key: readKey(match[1]),
        lines: [line],
      })
    } else if (groups.length) groups[groups.length - 1].lines.push(line)
  }
  const result: PropertyValues = {}
  for (const group of groups) {
    if (
      dedicated.has(canonicalFrontmatterKey(group.key)) ||
      isSystemMetadataKey(group.key) ||
      group.key.startsWith('_')
    )
      continue
    const duplicates = groups.filter(
      (other) =>
        canonicalFrontmatterKey(other.key) ===
        canonicalFrontmatterKey(group.key),
    )
    const rawValue = lineValue(group.lines[0])
    let parsed = values[group.key]
    if (rawValue.startsWith('"')) {
      try {
        const value: unknown = JSON.parse(rawValue)
        if (typeof value === 'string') parsed = value
      } catch {
        /* Display unsupported raw syntax below. */
      }
    } else if (rawValue.startsWith("'") && rawValue.endsWith("'"))
      parsed = rawValue.slice(1, -1).replace(/''/g, "'")
    if (rawValue.startsWith('[') && !rawValue.startsWith('[[')) {
      try {
        const json: unknown = JSON.parse(rawValue)
        if (
          Array.isArray(json) &&
          json.every((item) => typeof item === 'string')
        )
          parsed = json
      } catch {
        /* Preserve unsupported raw blocks below. */
      }
    }
    result[group.key] =
      unsupported(group.lines) || duplicates.length > 1
        ? { raw: duplicates.map((part) => part.lines.join('\n')).join('\n') }
        : (parsed ?? (Object.hasOwn(values, group.key) ? null : ''))
  }
  return result
}
