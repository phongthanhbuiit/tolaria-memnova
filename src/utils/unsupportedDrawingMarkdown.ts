import { durableToken, type DurableBlockCodec } from './durableMarkdownBlocks'
import { markdownFenceLanguage, projectMarkdownFences } from './snippetMarkdown'

export const UNSUPPORTED_DRAWING_TYPE = 'unsupportedDrawing'

// These are on-disk fence identifiers only. No drawing SDK or migration is needed.
const unsupportedLanguage = /^(?:tl(?:draw)|whiteboard)$/u

function readSource(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const opening = value.split('\n', 1)[0]
  return unsupportedLanguage.test(markdownFenceLanguage(opening)) ? value : null
}

export const unsupportedDrawingCodec: DurableBlockCodec = {
  tokenPrefix: '@@MEMNOVA_UNSUPPORTED_DRAWING:',
  tokenSuffix: '@@',
  readFenceMetadata: () => null,
  buildPayload: () => null,
  decodePayload: readSource,
  buildBlock: (block, source) => ({
    ...block,
    type: UNSUPPORTED_DRAWING_TYPE,
    props: { source: readSource(source) ?? '' },
    content: undefined,
  }),
  isBlock: block => block.type === UNSUPPORTED_DRAWING_TYPE,
  serializeBlock: block => {
    const source = readSource(block.props?.source)
    if (source === null) throw Error('Invalid legacy drawing source')
    return source
  },
}

export function preProcessUnsupportedDrawings(markdown: string): string {
  return projectMarkdownFences(markdown, (language, _closed, source) => {
    if (!unsupportedLanguage.test(language)) return undefined
    // The final line separator belongs to the surrounding Markdown, not the drawing.
    const fence = source().replace(/\r$/u, '')
    return `\n${durableToken(unsupportedDrawingCodec, fence)}\n`
  }, true)
}

export function hideUnsupportedDrawings(markdown: string, notice: string): string {
  return projectMarkdownFences(markdown, language => unsupportedLanguage.test(language) ? `\n${notice}\n` : undefined,
    true,
  )
}
