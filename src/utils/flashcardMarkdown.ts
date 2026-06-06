/**
 * flashcardMarkdown.ts
 *
 * Utilities for parsing and splitting flashcard content in Tolaria's
 * markdown files.
 *
 * Convention:
 *   A flashcard note contains an HTML comment marker:
 *
 *     <!-- FLASHCARD:BACK -->
 *
 *   Everything before this marker (exclusive) is the FRONT face.
 *   Everything after this marker (exclusive) is the BACK face.
 *
 *   If the marker is absent, the entire content is treated as the FRONT,
 *   and the BACK is empty (user recalls the answer mentally).
 */

export const FLASHCARD_BACK_MARKER = '<!-- FLASHCARD:BACK -->'

export interface FlashcardFaces {
  /** Markdown content for the front face (before the marker) */
  front: string
  /** Markdown content for the back face (after the marker), or empty string */
  back: string
  /** Whether the note has an explicit back face */
  hasBack: boolean
}

/**
 * Split note markdown content into front and back faces.
 *
 * The frontmatter block (---…---) is preserved in the FRONT portion
 * so that save/load round-trips work correctly.
 */
export function splitFlashcardContent(markdown: string): FlashcardFaces {
  const markerIndex = markdown.indexOf(FLASHCARD_BACK_MARKER)

  if (markerIndex === -1) {
    return {
      front: markdown,
      back: '',
      hasBack: false,
    }
  }

  const front = markdown.slice(0, markerIndex).trimEnd()
  const back = markdown.slice(markerIndex + FLASHCARD_BACK_MARKER.length).trimStart()

  return {
    front,
    back,
    hasBack: true,
  }
}

/**
 * Merge front and back faces back into a single markdown string.
 * Adds the marker between them.
 */
export function joinFlashcardContent(front: string, back: string): string {
  const trimmedFront = front.trimEnd()
  const trimmedBack = back.trimStart()

  if (!trimmedBack) {
    return trimmedFront
  }

  return `${trimmedFront}\n\n${FLASHCARD_BACK_MARKER}\n\n${trimmedBack}`
}

/**
 * Insert the `<!-- FLASHCARD:BACK -->` marker at the end of existing content.
 * Used when user clicks "Add Back Face" on a note that doesn't have one yet.
 */
export function appendFlashcardBackMarker(markdown: string): string {
  if (markdown.includes(FLASHCARD_BACK_MARKER)) return markdown
  const trimmed = markdown.trimEnd()
  return `${trimmed}\n\n${FLASHCARD_BACK_MARKER}\n`
}

/**
 * Remove the flashcard back marker and everything after it.
 * Used when user removes the back face entirely.
 */
export function removeFlashcardBack(markdown: string): string {
  const markerIndex = markdown.indexOf(FLASHCARD_BACK_MARKER)
  if (markerIndex === -1) return markdown
  return markdown.slice(0, markerIndex).trimEnd()
}

/**
 * Extract the display title for the front face of a flashcard.
 * Falls back to the note's H1 heading, then the filename-derived title.
 */
export function extractFlashcardFrontTitle(frontMarkdown: string): string {
  // Match first H1 heading
  const h1Match = frontMarkdown.match(/^#\s+(.+)$/m)
  if (h1Match?.[1]) return h1Match[1].trim()

  // Match frontmatter title field
  const titleMatch = frontMarkdown.match(/^title:\s*(.+)$/m)
  if (titleMatch?.[1]) return titleMatch[1].trim().replace(/^["']|["']$/g, '')

  return ''
}
