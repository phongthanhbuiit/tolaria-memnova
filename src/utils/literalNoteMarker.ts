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
    // A bare token adjacent to prose becomes part of that paragraph and cannot be decoded.
    // Isolate this renderer placeholder; the codec still serializes the original comment.
    const before = result.slice(0, line.start)
    const after = result.slice(line.end)
    const ending = markdown.slice(line.start + line.text.length, line.end)
    const separator = ending || '\n'
    const beforeGap = before && !/\r?\n\r?\n$/.test(before) ? separator : ''
    const afterGap = after && !/^\r?\n/.test(after) ? separator : ''
    result = before + beforeGap + token + ending + afterGap + after
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
