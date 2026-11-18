import {
  hasDurableMarkdownBlocks,
  injectDurableMarkdownBlocks,
  preProcessDurableMarkdownBlocks,
  serializeDurableMarkdownBlocks,
  type MarkdownSerializer,
} from './durableMarkdownBlocks'
import {
  hasFileAttachmentBlocks,
  injectFileAttachmentBlocks,
  preProcessFileAttachmentMarkdown,
  serializeFileAttachmentBlocks,
} from './fileAttachmentMarkdown'
import { literalNoteMarkerCodec, preProcessLiteralNoteMarkers } from './literalNoteMarker'
import { restoreWikilinksInBlocks } from './wikilinks'
import { serializeMathAwareBlocks } from './mathMarkdown'
import { mermaidMarkdownCodec } from './mermaidMarkdown'
import { preProcessUnsupportedDrawings, unsupportedDrawingCodec } from './unsupportedDrawingMarkdown'
import { excalidrawMarkdownCodec } from './excalidrawMarkdown'

const EDITOR_DURABLE_MARKDOWN_CODECS = [
  mermaidMarkdownCodec,
  excalidrawMarkdownCodec,
  literalNoteMarkerCodec,
  unsupportedDrawingCodec,
] as const

export function preProcessDurableEditorMarkdown({ markdown }: { markdown: string }): string {
  const withDurableBlocks = preProcessDurableMarkdownBlocks({
    markdown: preProcessUnsupportedDrawings(preProcessLiteralNoteMarkers(markdown)),
    codecs: EDITOR_DURABLE_MARKDOWN_CODECS,
  })
  return preProcessFileAttachmentMarkdown({ markdown: withDurableBlocks })
}

export function injectDurableEditorMarkdownBlocks(blocks: unknown[]): unknown[] {
  const withDurableBlocks = injectDurableMarkdownBlocks({
    blocks,
    codecs: EDITOR_DURABLE_MARKDOWN_CODECS,
  })
  return injectFileAttachmentBlocks(withDurableBlocks)
}

export function serializeDurableEditorBlocks(
  editor: MarkdownSerializer,
  blocks: unknown[],
  vaultPath?: string,
): string {
  const sourceLinks = new Map<string, string>()
  const markdown = serializeFileAttachmentBlocks({
    blocks: restoreWikilinksInBlocks(blocks, sourceLinks),
    vaultPath,
    serializeOrdinaryBlocks: ordinaryBlocks => serializeDurableMarkdownBlocks({
      blocks: ordinaryBlocks,
      codecs: EDITOR_DURABLE_MARKDOWN_CODECS,
      serializeOrdinaryBlocks: durableOrdinaryBlocks => serializeMathAwareBlocks(editor, durableOrdinaryBlocks),
    }),
  })
  return sourceLinks.size ? markdown.replace(/TOLARIANOTELINK[a-f0-9]{32}/gu, token => sourceLinks.get(token) ?? token) : markdown
}

export function hasDurableEditorBlocks(blocks: unknown[]): boolean {
  return hasFileAttachmentBlocks(blocks) || hasDurableMarkdownBlocks({
    blocks,
    codecs: EDITOR_DURABLE_MARKDOWN_CODECS,
  })
}
