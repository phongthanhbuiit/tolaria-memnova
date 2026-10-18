import type { MemoryLine } from './noteMemoryLines'

export type MemoryFace = 'front' | 'back'
export type MemoryBack = { kind: 'inline' } | { kind: 'page'; pageId: string; face: MemoryFace }
export interface NoteMemoryConfig {
  version: 1
  enabled: boolean
  back: MemoryBack
}
export type MemoryIssue = 'unclosed-frontmatter' | 'ambiguous-back-marker' | 'unsupported-version' | 'invalid-config' | 'invalid-system-field' | 'duplicate-system-field'

export const memoryConfigKeys = [
  '_memnova_learning_version', '_memnova_learning_enabled', '_memnova_back_kind',
  '_memnova_back_page_id', '_memnova_back_face',
] as const
const owned = new Set<string>(['_memnova_page_id', ...memoryConfigKeys])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function memoryScalar(value: string): string {
  const clean = value.replace(/\s+#.*$/, '').trim()
  const quote = clean[0]
  return clean.length > 1 && (quote === '"' || quote === "'") && clean.endsWith(quote) ? clean.slice(1, -1) : clean
}

export function memoryFields(lines: MemoryLine[]): { values: Map<string, string>; issues: MemoryIssue[] } {
  const values = new Map<string, string>()
  const issues: MemoryIssue[] = []
  for (const line of lines) {
    const key = line.text.match(/^\s*["']?(_memnova_\w+)["']?\s*:/)?.[1]
    if (!key || !owned.has(key)) continue
    if (!line.text.startsWith(`${key}:`)) {
      issues.push('invalid-system-field')
      continue
    }
    if (values.has(key)) issues.push('duplicate-system-field')
    values.set(key, line.text.slice(key.length + 1).trim())
  }
  return { values, issues: [...new Set(issues)] }
}

function readBack(fields: Map<string, string>): MemoryBack | null {
  const kind = memoryScalar(fields.get('_memnova_back_kind') ?? '')
  if (kind === 'inline') {
    return fields.has('_memnova_back_page_id') || fields.has('_memnova_back_face') ? null : { kind }
  }
  const pageId = memoryScalar(fields.get('_memnova_back_page_id') ?? '')
  const face = memoryScalar(fields.get('_memnova_back_face') ?? '')
  if (kind !== 'page' || !uuidPattern.test(pageId) || (face !== 'front' && face !== 'back')) return null
  return { kind, pageId: pageId.toLowerCase(), face }
}

export function readMemoryConfig(lines: MemoryLine[]): { config: NoteMemoryConfig | null; pageId: string | null; issues: MemoryIssue[] } {
  const { values, issues } = memoryFields(lines)
  const rawId = values.get('_memnova_page_id')
  const pageId = rawId === undefined ? null : memoryScalar(rawId).toLowerCase()
  if (pageId !== null && !uuidPattern.test(pageId)) issues.push('invalid-system-field')
  if (issues.length || !memoryConfigKeys.some(key => values.has(key))) return { config: null, pageId, issues }
  const version = values.get('_memnova_learning_version')?.replace(/\s+#.*$/, '').trim()
  if (version && /^[2-9]\d*$|^1\d+$/.test(version)) return { config: null, pageId, issues: ['unsupported-version'] }
  const enabled = values.get('_memnova_learning_enabled')?.replace(/\s+#.*$/, '').trim()
  const back = readBack(values)
  if (version !== '1' || (enabled !== 'true' && enabled !== 'false') || !back) return { config: null, pageId, issues: ['invalid-config'] }
  return { config: { version: 1, enabled: enabled === 'true', back }, pageId, issues: [] }
}

export function memoryConfigValues(config: NoteMemoryConfig): Map<string, string> {
  const values = new Map<string, string>([
    ['_memnova_learning_version', '1'],
    ['_memnova_learning_enabled', String(config.enabled)],
    ['_memnova_back_kind', config.back.kind],
  ])
  if (config.back.kind === 'page') {
    values.set('_memnova_back_page_id', config.back.pageId)
    values.set('_memnova_back_face', config.back.face)
  }
  return values
}
