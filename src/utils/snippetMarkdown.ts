interface Fence { marker: string; info: string }

function opening(line: string): Fence | null {
  const match = /^( {0,3})(`{3,}|~{3,})([^\r\n]*)\r?$/.exec(line)
  return match ? { marker: match[2], info: match[3].trim() } : null
}

function closes(line: string, fence: Fence): boolean {
  const candidate = opening(line)
  return !!candidate && !candidate.info && candidate.marker[0] === fence.marker[0]
    && candidate.marker.length >= fence.marker.length
}

function projectFences(
  content: string,
  replacementFor: (language: string, closed: boolean) => string | undefined,
): string {
  const lines = content.split('\n')
  for (let index = 0; index < lines.length;) {
    const fence = opening(lines[index])
    if (!fence) { index++; continue }
    let end = index + 1
    while (end < lines.length && !closes(lines[end], fence)) end++
    const language = fence.info.split(/\s+/u)[0].toLowerCase()
    const replacement = replacementFor(language, end < lines.length)
    if (replacement !== undefined) {
      lines.fill('', index, end + 1)
      lines[index] = replacement
    }
    index = end + 1
  }
  return lines.join('\n')
}

/** Display projection only. Ordinary and unclosed fences retain their snippet semantics. */
export function snippetMarkdown(content: string): string {
  return projectFences(content, (language, closed) => closed && language === 'excalidraw' ? '' : undefined)
}

/** Replace unsupported drawing payloads in the read-only view. */
export function projectLegacyDrawingMarkdown(content: string, message: string): string {
  return projectFences(content, (language) =>
    language === 'tldraw' || language === 'whiteboard' ? `\n${message}\n` : undefined,
  )
}
