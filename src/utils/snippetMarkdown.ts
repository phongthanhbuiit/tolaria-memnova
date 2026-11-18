interface Fence { marker: string; info: string; quotes: number; indent: number; listed: boolean }

function unwrapContainers(line: string, nested: boolean) {
  let text = line
  let quotes = 0
  let listed = false
  if (nested) {
    for (;;) {
      const prefix = /^[ \t]*(?:(>)[ \t]?|([-+*]|[0-9]{1,9}[.)])[ \t]+)/u.exec(text)
      if (!prefix) break
      if (prefix[1]) quotes++
      else listed = true
      text = text.slice(prefix[0].length)
    }
  }
  return { text, quotes, listed, width: line.length - text.length }
}

function opening(line: string, nested: boolean): Fence | null {
  const { text, quotes, listed, width } = unwrapContainers(line, nested)
  const match = (nested ? /^([ \t]*)(`{3,}|~{3,})([^\r\n]*)\r?$/u : /^( {0,3})(`{3,}|~{3,})([^\r\n]*)\r?$/u).exec(text)
  if (!match) return null
  return { marker: match[2], info: match[3].trim(), quotes, listed, indent: width + match[1].length }
}

export function markdownFenceLanguage(line: string): string {
  return opening(line, true)?.info.split(/\s+/u)[0].toLowerCase() ?? ''
}

function closes(line: string, fence: Fence, nested: boolean): boolean {
  const candidate = opening(line, nested)
  return !!candidate && candidate.quotes === fence.quotes && !candidate.listed && !candidate.info
    && candidate.marker[0] === fence.marker[0] && candidate.marker.length >= fence.marker.length
}

function leavesContainer(line: string, fence: Fence): boolean {
  if (!fence.quotes && !fence.listed) return false
  const { text, quotes, width, listed } = unwrapContainers(line, true)
  if (quotes < fence.quotes) return true
  if (!fence.listed || !text.trim()) return false
  return listed || width + text.length - text.trimStart().length < fence.indent
}

export function projectMarkdownFences(
  content: string,
  replacementFor: (language: string, closed: boolean, source: () => string) => string | undefined,
  nested = false,
): string {
  const lines = content.split('\n')
  for (let index = 0; index < lines.length;) {
    const fence = opening(lines[index], nested)
    if (!fence) { index++; continue }
    let end = index + 1
    while (end < lines.length && !leavesContainer(lines[end], fence) && !closes(lines[end], fence, nested)) end++
    const closed = end < lines.length && !leavesContainer(lines[end], fence)
    const next = closed ? end + 1 : end
    const language = fence.info.split(/\s+/u)[0].toLowerCase()
    const replacement = replacementFor(language, closed, () => lines.slice(index, next).join('\n'))
    if (replacement !== undefined) {
      lines.fill('', index, next)
      lines[index] = replacement
    }
    index = next
  }
  return lines.join('\n')
}

/** Display projection only. Ordinary and unclosed fences retain their snippet semantics. */
export function snippetMarkdown(content: string): string {
  return projectMarkdownFences(content, (language, closed) => closed && language === 'excalidraw' ? '' : undefined)
}
