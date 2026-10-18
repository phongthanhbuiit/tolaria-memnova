import fs from 'node:fs'
import path from 'node:path'
import { createFixtureVaultCopy } from './fixtureVault'

export const noteMemoryFixtureIds = {
  owner: 'c7c37125-1711-4dd3-b04e-5a8e271a80aa',
  source: '1c54f4da-80c6-4761-98e7-02d4e137b73c',
} as const

export function a4FixtureBody(): string {
  const paragraph = 'A cell keeps its membrane, nucleus and energy system in balance. Recall each part using a distinct visual landmark.'
  return `# Alpha Project\n\n${Array.from({ length: 48 }, (_, index) => `## Section ${index + 1}\n\n${paragraph}`).join('\n\n')}\n`
}

/** Disposable synthetic content only; this helper never reads a user Library. */
export function createNoteMemoryFixture(): string {
  const root = createFixtureVaultCopy()
  fs.writeFileSync(path.join(root, 'project/alpha-project.md'), a4FixtureBody())
  const directory = path.join(root, 'memory-fixtures')
  fs.mkdirSync(directory)
  const owner = `---\n_memnova_page_id: ${noteMemoryFixtureIds.owner}\n_fsrs_enabled: true\ncontext: {keep: [false, 9007199254740993]}\n---\n# Memory lesson\n\nRecall the cell.\n\n<!-- FLASHCARD:BACK -->\n\n    Preserve indented code\n\n![Memory image](../attachments/memory-image.png)\n`
  const sources = {
    'legacy.md': owner,
    'legacy-crlf.md': owner.replaceAll(noteMemoryFixtureIds.owner, '5212bad0-5261-43a5-a679-12d5d51c238a').replaceAll('\n', '\r\n'),
    'source.md': `---\n_memnova_page_id: ${noteMemoryFixtureIds.source}\n---\n# Source note\n\nSource text is not a review.\n`,
    'empty-board.md': '# Empty board\n\n```tldraw id="empty"\n{}\n```\n',
    'invalid-board.md': '# Invalid board\n\n```tldraw id="invalid"\n{broken snapshot\n```\n',
    'literal-marker.md': '# Ordinary note\n\n```html\n<!-- FLASHCARD:BACK -->\n```\n',
  }
  for (const [name, content] of Object.entries(sources)) {
    fs.writeFileSync(path.join(directory, name), content)
  }
  fs.mkdirSync(path.join(root, 'attachments'), { recursive: true })
  fs.writeFileSync(path.join(root, 'attachments/memory-image.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'))
  return root
}
