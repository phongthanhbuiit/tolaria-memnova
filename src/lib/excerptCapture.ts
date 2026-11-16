import { canonicalWikilinkTargetForEntry } from '../utils/wikilink'
import type { VaultEntry } from '../types'

export type ExcerptSource = { kind: 'note'; entry: VaultEntry } | { kind: 'web'; url: string }

export interface ExcerptCapture {
  id: string
  vaultPath: string
  text: string
  source: ExcerptSource
}

export interface ExcerptSelection {
  path: string
  text: string
  isCurrent: () => boolean
  restoreFocus: () => void
}

export const EXCERPT_CAPTURE_EVENT = 'memnova:capture-excerpt'

export function requestExcerptCapture(selection?: ExcerptSelection) {
  window.dispatchEvent(new CustomEvent(EXCERPT_CAPTURE_EVENT, { detail: selection }))
}

export function excerptSourceUrl(input: string): string | null {
  try {
    const url = new URL(input.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

function literalMarkdown(text: string) {
  // A pasted excerpt is quoted text, including any embeds, headings or HTML it contains.
  return text.replace(/[\\`*_[\]<>!#~|]/gu, '\\$&').replace(/^(\s*)(\d*)([+.-])(?=\s)/u, '$1$2\\$3')
}

// A migrated Library adds exactly one owned UUID to the capture's fixed frontmatter.
const generatedPageIdentity = /^(---\ntype: Note\n)_memnova_page_id: [a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\n(?=---\n)/u

export function matchesCapturedNote(stored: string, requested: string) {
  return stored === requested || stored.replace(generatedPageIdentity, '$1') === requested
}

export function excerptNoteContent({ text, source, vaultPath }: ExcerptCapture) {
  const lines = text.trim().split(/\r\n?|\n/u)
  const title = Array.from(lines[0]).slice(0, 72).join('')
  const quote = lines.map(line => `> ${literalMarkdown(line)}`).join('\n')
  let link: string
  if (source.kind === 'note') {
    const target = canonicalWikilinkTargetForEntry(source.entry, vaultPath)
    // An ordinary Markdown link also supports filenames containing wiki delimiters.
    link = /[|[\]#\r\n]/u.test(target)
      ? `[${literalMarkdown(source.entry.title)}](<${target.split('/').map(encodeURIComponent).join('/')}.md>)`
      : `[[${target}]]`
  } else {
    const url = excerptSourceUrl(source.url)
    if (!url) throw new Error('Invalid excerpt source URL')
    link = `<${url}>`
  }
  return { title, content: `---\ntype: Note\n---\n\n# ${literalMarkdown(title)}\n\n${quote}\n\n${link}\n` }
}
