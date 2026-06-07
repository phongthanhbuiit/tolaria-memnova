/**
 * flashcardAudio.test.ts
 *
 * Tests for resolveFlashcardAudioUrl — the pure function that picks
 * the best playable audio URL for a flashcard from three sources:
 *  1. `audio` frontmatter property
 *  2. ![[filename.mp3]] wikilink in back-face markdown
 *  3. Full asset:// or https:// URL in back-face markdown
 */

import { describe, expect, it, vi } from 'vitest'
import { resolveFlashcardAudioUrl } from './flashcardAudio'

// Mock Tauri's convertFileSrc — same pattern used in vaultAttachments.test.ts
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${encodeURIComponent(path)}`),
  invoke: vi.fn(),
}))

const VAULT = '/Users/test/Vault'

function assetUrl(path: string): string {
  return `asset://localhost/${encodeURIComponent(path)}`
}

// ---------------------------------------------------------------------------
// Helper: expected asset URL for a vault attachment filename
// ---------------------------------------------------------------------------

function expectedUrl(filename: string): string {
  return assetUrl(`${VAULT}/attachments/${filename}`)
}

// ---------------------------------------------------------------------------
// Null / no-op cases
// ---------------------------------------------------------------------------

describe('resolveFlashcardAudioUrl — no audio', () => {
  it('returns null when no audio and no back markdown', () => {
    expect(resolveFlashcardAudioUrl({ properties: {}, backMarkdown: null, vaultPath: VAULT })).toBeNull()
  })

  it('returns null when no audio and back markdown has no audio block', () => {
    expect(
      resolveFlashcardAudioUrl({
        properties: {},
        backMarkdown: '**Meaning:** word\n\nExample sentence.',
        vaultPath: VAULT,
      }),
    ).toBeNull()
  })

  it('returns null when vaultPath is null (no vault loaded)', () => {
    expect(
      resolveFlashcardAudioUrl({
        properties: { audio: 'word.mp3' },
        backMarkdown: '![[word.mp3]]',
        vaultPath: null,
      }),
    ).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Priority 1: `audio` frontmatter property
// ---------------------------------------------------------------------------

describe('resolveFlashcardAudioUrl — audio property (priority 1)', () => {
  it('resolves plain filename to vault attachment asset URL', () => {
    const result = resolveFlashcardAudioUrl({
      properties: { audio: 'word.mp3' },
      backMarkdown: null,
      vaultPath: VAULT,
    })
    expect(result).toBe(expectedUrl('word.mp3'))
  })

  it('resolves filename with attachments/ prefix already present', () => {
    const result = resolveFlashcardAudioUrl({
      properties: { audio: 'attachments/word.mp3' },
      backMarkdown: null,
      vaultPath: VAULT,
    })
    expect(result).toBe(expectedUrl('word.mp3'))
  })

  it('returns an asset:// URL as-is (no double-encoding)', () => {
    const fullUrl = 'asset://localhost/%2Fvault%2Fattachments%2Fword.mp3'
    const result = resolveFlashcardAudioUrl({
      properties: { audio: fullUrl },
      backMarkdown: null,
      vaultPath: VAULT,
    })
    expect(result).toBe(fullUrl)
  })

  it('ignores empty audio property', () => {
    const result = resolveFlashcardAudioUrl({
      properties: { audio: '   ' },
      backMarkdown: '![[fallback.mp3]]',
      vaultPath: VAULT,
    })
    // Falls through to wikilink
    expect(result).toBe(expectedUrl('fallback.mp3'))
  })

  it('audio property takes priority over wikilink in back face', () => {
    const result = resolveFlashcardAudioUrl({
      properties: { audio: 'word.mp3' },
      backMarkdown: '![[other.mp3]]',
      vaultPath: VAULT,
    })
    expect(result).toBe(expectedUrl('word.mp3'))
  })

  it('supports wav, ogg, m4a, aac, flac extensions', () => {
    for (const ext of ['wav', 'ogg', 'm4a', 'aac', 'flac']) {
      const result = resolveFlashcardAudioUrl({
        properties: { audio: `sound.${ext}` },
        backMarkdown: null,
        vaultPath: VAULT,
      })
      expect(result).toBe(expectedUrl(`sound.${ext}`))
    }
  })
})

// ---------------------------------------------------------------------------
// Priority 2: ![[filename.mp3]] wikilink in back-face markdown
// ---------------------------------------------------------------------------

describe('resolveFlashcardAudioUrl — wikilink in back face (priority 2)', () => {
  it('resolves ![[filename.mp3]] wikilink', () => {
    const result = resolveFlashcardAudioUrl({
      properties: {},
      backMarkdown: '![[hello.mp3]]',
      vaultPath: VAULT,
    })
    expect(result).toBe(expectedUrl('hello.mp3'))
  })

  it('resolves wikilink embedded in longer back face text', () => {
    const result = resolveFlashcardAudioUrl({
      properties: {},
      backMarkdown: '**Meaning:** word\n\n![[word.mp3]]\n\n**Example:** sentence.',
      vaultPath: VAULT,
    })
    expect(result).toBe(expectedUrl('word.mp3'))
  })

  it('is case-insensitive for file extension', () => {
    const result = resolveFlashcardAudioUrl({
      properties: {},
      backMarkdown: '![[Word.MP3]]',
      vaultPath: VAULT,
    })
    expect(result).toBe(expectedUrl('Word.MP3'))
  })

  it('ignores image wikilinks (.png, .jpg)', () => {
    const result = resolveFlashcardAudioUrl({
      properties: {},
      backMarkdown: '![[photo.png]]',
      vaultPath: VAULT,
    })
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Priority 3: full asset:// or https:// URL in back-face markdown
// ---------------------------------------------------------------------------

describe('resolveFlashcardAudioUrl — full URL in back face (priority 3)', () => {
  it('returns a full asset:// URL from back face markdown image syntax', () => {
    const url = 'asset://localhost/%2Fvault%2Fattachments%2Fword.mp3'
    const result = resolveFlashcardAudioUrl({
      properties: {},
      backMarkdown: `![audio](${url})`,
      vaultPath: VAULT,
    })
    expect(result).toBe(url)
  })

  it('returns a https:// URL from back face markdown', () => {
    const url = 'https://example.com/sounds/word.mp3'
    const result = resolveFlashcardAudioUrl({
      properties: {},
      backMarkdown: `![word](${url})`,
      vaultPath: VAULT,
    })
    expect(result).toBe(url)
  })
})
