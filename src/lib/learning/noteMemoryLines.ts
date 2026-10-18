export interface MemoryLine {
  start: number
  end: number
  text: string
}

export interface MemoryHeader {
  contentStart: number
  contentEnd: number
  bodyStart: number
}

export interface Fence {
  character: string
  length: number
  info: string
}

interface InlineContext {
  comment: boolean
  ticks: number
}

export const MEMORY_BACK_MARKER = '<!-- FLASHCARD:BACK -->'

export function memoryLines(source: string): MemoryLine[] {
  let start = 0
  return (source.match(/[^\n]*\n|[^\n]+$/g) ?? []).map(raw => {
    const line = { start, end: start + raw.length, text: raw.replace(/\r?\n$/, '') }
    start = line.end
    return line
  })
}

export function memoryHeader(lines: MemoryLine[]): MemoryHeader | null | 'unclosed' {
  if (lines[0]?.text.replace(/^\ufeff/, '').trimEnd() !== '---') return null
  const closing = lines.slice(1).find(line => line.text.trimEnd() === '---')
  if (!closing) return 'unclosed'
  return { contentStart: lines[0].end, contentEnd: closing.start, bodyStart: closing.end }
}

export function fenceAt(line: string): Fence | null {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
  return match ? { character: match[1][0], length: match[1].length, info: match[2] } : null
}

function escaped(source: string, offset: number): boolean {
  let count = 0
  for (let index = offset - 1; index >= 0 && source[index] === '\\'; index -= 1) count += 1
  return count % 2 === 1
}

function advanceInline(source: string, context: InlineContext): void {
  for (const match of source.matchAll(/<!--|-->|`+/g)) {
    if (escaped(source, match.index)) continue
    const token = match[0]
    if (context.comment) {
      if (token === '-->') context.comment = false
    } else if (context.ticks) {
      if (token[0] === '`' && token.length === context.ticks) context.ticks = 0
    } else if (token === '<!--') context.comment = true
    else if (token[0] === '`') context.ticks = token.length
  }
}

export function closesFence(candidate: Fence | null, fence: Fence): boolean {
  return candidate?.character === fence.character && candidate.length >= fence.length && !candidate.info.trim()
}

export function opensFence(candidate: Fence | null): candidate is Fence {
  return candidate !== null && !(candidate.character === '`' && candidate.info.includes('`'))
}

export function memoryBoundaries(lines: MemoryLine[]): MemoryLine[] {
  const boundaries: MemoryLine[] = []
  const context: InlineContext = { comment: false, ticks: 0 }
  let fence: Fence | null = null
  for (const line of lines) {
    const candidate = fenceAt(line.text)
    if (fence) {
      if (closesFence(candidate, fence)) fence = null
      continue
    }
    if (!context.comment && !context.ticks) {
      if (opensFence(candidate)) {
        fence = candidate
        continue
      }
      if (line.text.trimEnd() === MEMORY_BACK_MARKER) {
        boundaries.push(line)
        continue
      }
    }
    advanceInline(line.text, context)
  }
  return boundaries
}
