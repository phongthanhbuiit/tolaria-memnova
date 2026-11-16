export function isSafePathSegment({ segment }: { segment: string }): boolean {
  return segment.length > 0
    && segment !== '.'
    && segment !== '..'
    && !segment.includes('/')
    && !segment.includes('\\')
}

export function decodeRelativePath({ path }: { path: string }): string | null {
  const pathname = path
  const encodedPath = pathname.replace(/^\/+/u, '')
  if (!encodedPath) return null

  const segments = encodedPath.split('/')
  const decodedSegments: string[] = []
  for (const segment of segments) {
    if (!segment) return null
    try {
      const decoded = decodeURIComponent(segment)
      if (!isSafePathSegment({ segment: decoded })) return null
      decodedSegments.push(decoded)
    } catch {
      return null
    }
  }
  return decodedSegments.join('/')
}

/** Explicit relative Markdown note links, including older excerpt links without a leading "./". */
export function relativeMarkdownNotePath(href: string): string | null {
  const path = href.replace(/^\.\//u, '')
  if (!/^[\w.!~*'()%/-]+\.md$/iu.test(path) || path.startsWith('/')) return null
  if (!href.startsWith('./') && !/%(?:23|5b|5d|7c|0a|0d)/iu.test(path)) return null
  return decodeRelativePath({ path })
}

export function markdownNoteLink(label: string, href: string): string {
  const display = label.replace(/[\\`*_[\]<>!#~|]/gu, '\\$&')
  return `[${display}](<${href}>)`
}
