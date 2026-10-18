import { expect, it } from 'vitest'
import { detectFrontmatterState, parseFrontmatter } from './frontmatter'
import { splitFrontmatter } from './wikilinks'
it('uses one BOM-prefixed CRLF header for Inspector and rich-editor splitting', () => {
  const header = '\ufeff---\r\nStatus: Draft\r\n_width: wide\r\n---\r\n'
  const body = 'Article\r\n<!-- FLASHCARD:BACK -->\r\nMnemonic\r\n'
  expect(parseFrontmatter(header + body)).toMatchObject({ Status: 'Draft', _width: 'wide' })
  expect(detectFrontmatterState(header + body)).toBe('valid')
  expect(splitFrontmatter(header + body)).toEqual([header, body])
})
