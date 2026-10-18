import { memoryBoundaries, memoryLines, MEMORY_BACK_MARKER } from '../lib/learning/noteMemoryLines'
import type { DurableBlockCodec } from './durableMarkdownBlocks'

export const LITERAL_NOTE_MARKER_TYPE = 'literalNoteMarker'
const prefix = '@@MEMNOVA_LITERAL_NOTE_MARKER:'
const suffix = '@@'
function marker(value: unknown): string | null {
  return typeof value === 'string' && value.trimEnd() === MEMORY_BACK_MARKER ? value : null
}

/** Protect ordinary comments before the Markdown UI parser discards HTML comments. */
export function preProcessLiteralNoteMarkers(markdown: string): string {
  let result = markdown
  for (const line of memoryBoundaries(memoryLines(markdown)).reverse()) {
    const token = `${prefix}${encodeURIComponent(JSON.stringify(line.text))}${suffix}`
    result = result.slice(0, line.start) + token + markdown.slice(line.start + line.text.length, line.end) + result.slice(line.end)
  }
  return result
}
export const literalNoteMarkerCodec: DurableBlockCodec = {
  tokenPrefix: prefix,
  tokenSuffix: suffix,
  readFenceMetadata: () => null,
  buildPayload: () => null,
  decodePayload: marker,
  buildBlock: (block, source) => ({ ...block, type: LITERAL_NOTE_MARKER_TYPE, props: { source: marker(source) ?? MEMORY_BACK_MARKER }, content: undefined }),
  isBlock: block => block.type === LITERAL_NOTE_MARKER_TYPE,
  serializeBlock: block => {
    const source = marker(block.props?.source)
    if (source === null) throw Error('Invalid literal note marker; source was preserved')
    return source
  },
}
