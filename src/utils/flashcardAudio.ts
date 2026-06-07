/**
 * flashcardAudio.ts
 *
 * Utilities for resolving playable audio URLs from flashcard entries.
 *
 * Audio source priority (highest → lowest):
 *  1. `audio` frontmatter property — filename typed in FlashcardPanel UI
 *  2. `![[filename.mp3]]` wikilink detected in back-face markdown
 *  3. Full `asset://` or `https://` URL in back-face markdown
 *
 * All relative filenames are resolved to a Tauri `asset://` URL so that
 * `new Audio(url).play()` actually works inside the WebView.
 */

import { vaultAttachmentAssetUrl } from './vaultAttachments'

const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|m4a|aac|flac)$/i

export type AudioResolutionInput = {
  /** User-defined properties map from VaultEntry */
  properties: Record<string, unknown>
  /** Markdown content of the card back face (may contain ![[*.mp3]] wikilinks) */
  backMarkdown: string | null
  /** Absolute vault path — needed to build asset:// URLs for relative filenames */
  vaultPath: string | null
}

/**
 * Convert a filename or attachment path to a playable Tauri asset URL.
 * Returns null when vaultPath is unavailable or filename is empty.
 */
function filenameToAssetUrl(filename: string, vaultPath: string): string | null {
  if (!filename.trim()) return null
  // Already a full URL
  if (filename.startsWith('asset://') || filename.startsWith('http')) return filename
  // Build `attachments/filename.mp3` and resolve to asset://
  const attachmentPath = filename.startsWith('attachments/') ? filename : `attachments/${filename}`
  return vaultAttachmentAssetUrl({ attachmentPath, vaultPath })
}

/**
 * Resolve the best playable audio URL for a flashcard, or null if none found.
 */
export function resolveFlashcardAudioUrl({
  properties,
  backMarkdown,
  vaultPath,
}: AudioResolutionInput): string | null {
  if (!vaultPath) return null

  // 1. `audio` frontmatter property (set via FlashcardPanel)
  const propAudio = properties['audio']
  if (typeof propAudio === 'string' && propAudio.trim()) {
    const url = filenameToAssetUrl(propAudio.trim(), vaultPath)
    if (url) return url
  }

  if (!backMarkdown) return null

  // 2. ![[filename.mp3]] wikilink
  const wikilinkMatch = backMarkdown.match(/!\[\[([^\]]+)\]\]/i)
  if (wikilinkMatch) {
    const name = wikilinkMatch[1]
    if (AUDIO_EXTENSIONS.test(name)) {
      const url = filenameToAssetUrl(name, vaultPath)
      if (url) return url
    }
  }

  // 3. Full asset:// or https:// URL in markdown syntax
  const fullUrlPattern = new RegExp(
    '!\\[[^\\]]*\\]\\(((?:asset|https?):\\/\\/[^)]+\\.(?:mp3|wav|ogg|m4a|aac|flac))\\)',
    'i',
  )
  const urlMatch = backMarkdown.match(fullUrlPattern)
  if (urlMatch) return urlMatch[1]

  return null
}
