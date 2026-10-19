import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from '@playwright/test'
const samples: { name: string; source: string; expected: string }[] = JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/durable-snippets.json'), 'utf8'))

test('dev file adapter matches the shared native/frontend snippet corpus without rewriting files', async ({ request }) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'memnova-ux-snippets-'))
  try {
    for (const [index, sample] of samples.entries()) fs.writeFileSync(path.join(root, `${index}.md`), sample.source)
    const response = await request.get('/api/vault/list', { params: { path: root, vault_path: root } })
    expect(response.ok()).toBe(true)
    const entries: { path: string; snippet: string }[] = await response.json()
    for (const [index, sample] of samples.entries()) {
      const filename = path.join(root, `${index}.md`)
      expect(entries.find(entry => entry.path === filename)?.snippet, sample.name).toBe(sample.expected)
      expect(fs.readFileSync(filename, 'utf8')).toBe(sample.source)
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
})
