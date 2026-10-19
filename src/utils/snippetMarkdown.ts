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

/** Display projection only. Ordinary/unclosed fences retain their existing snippet semantics. */
export function snippetMarkdown(content: string): string {
  const lines = content.split('\n')
  for (let index = 0; index < lines.length;) {
    const fence = opening(lines[index])
    if (!fence) { index++; continue }
    let end = index + 1
    while (end < lines.length && !closes(lines[end], fence)) end++
    if (end === lines.length) break
    if (fence.info.split(/\s+/u)[0].toLowerCase() === 'tldraw')
      lines.fill('', index, end + 1)
    index = end + 1
  }
  return lines.join('\n')
}
