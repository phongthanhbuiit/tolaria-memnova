import { closesFence, fenceAt, memoryLines, opensFence, type Fence } from './noteMemoryLines'
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) }
function boardUseful(source: string): boolean {
  if (!source.trim()) return false
  let value: unknown
  try { value = JSON.parse(source) } catch { throw Error('invalid-canvas') }
  if (!record(value)) throw Error('invalid-canvas')
  if (!Object.keys(value).length) return false
  if (value.type !== 'excalidraw' || value.version !== 2 || !Array.isArray(value.elements)) throw Error('unsupported-canvas')
  return value.elements.some(item => record(item) && typeof item.type === 'string' && !item.isDeleted)
}
/** Shared browser QA readiness; native validation remains authoritative. */
export function usefulMemoryContent(source: string): boolean {
  let useful = false
  let fence: Fence | null = null
  let boardStart: number | null = null
  let normalContent = false
  for (const line of memoryLines(source)) {
    const candidate = fenceAt(line.text)
    if (fence) {
      if (closesFence(candidate, fence)) {
        useful = (boardStart === null ? normalContent : boardUseful(source.slice(boardStart, line.start))) || useful
        boardStart = null
        fence = null
      } else if (boardStart === null && line.text.trim()) normalContent = true
      continue
    }
    if (opensFence(candidate)) {
      boardStart = candidate.info.trim().split(/\s+/)[0].toLowerCase() === 'excalidraw' ? line.end : null
      normalContent = false
      fence = candidate
    } else useful = Boolean(line.text.trim()) || useful
  }
  if (boardStart !== null) throw Error('unclosed-canvas')
  return useful || normalContent
}
