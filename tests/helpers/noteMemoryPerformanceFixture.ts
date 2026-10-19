import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { a4FixtureBody, createNoteMemoryFixture } from './noteMemoryFixture'

interface SceneRecord { id: string; typeName: string; type?: string; props?: Record<string, unknown>; [key: string]: unknown }
interface Scene { store: Record<string, SceneRecord>; schema: unknown }
const imageDirectory = path.resolve('tests/fixtures/performance')
const syntaxShapeIds: Record<number, string> = { 3: 'shape:LhZ-_aBWyGPVitl6TCMFW', 4: 'shape:BvUmrZiWDexrb57Za_Il_' }

export function readPerformanceScene(file: string): Scene {
  const match = /```tldraw[^\n]*\n([\s\S]*?)\n```/.exec(fs.readFileSync(file, 'utf8'))
  if (!match) throw new Error('Missing performance canvas')
  return JSON.parse(match[1]) as Scene
}
export function performanceShapeCount(file: string): number {
  return Object.values(readPerformanceScene(file).store).filter(record => record.typeName === 'shape').length
}

function sceneWithShapes(count: number): Scene {
  const template = JSON.parse(fs.readFileSync('tests/fixtures/note-memory-study-canvas.json', 'utf8')) as Scene
  const records = Object.values(template.store)
  const draw = records.find(record => record.typeName === 'shape' && record.type === 'draw')!
  const image = records.find(record => record.typeName === 'shape' && record.type === 'image')!
  const asset = records.find(record => record.typeName === 'asset')!
  const store = Object.fromEntries(records.filter(record => !['shape', 'asset'].includes(record.typeName)).map(record => [record.id, record]))
  for (let index = 0; index < count; index++) {
    const id = syntaxShapeIds[index] ?? `shape:performance-${index}`
    const base = { id, index: `a1${index.toString(36).padStart(4, '0')}V`, x: 40 + index % 40 * 12, y: 40 + Math.floor(index / 40) * 12 }
    if (index < 3) {
      const assetId = `asset:performance-${index}`, name = `memory-${index + 1}.png`
      store[assetId] = { ...asset, id: assetId, props: { ...asset.props, name, src: `asset://memnova/attachments/${name}`, w: 320, h: 200, mimeType: 'image/png', fileSize: fs.statSync(path.join(imageDirectory, name)).size } }
      store[id] = { ...image, ...base, x: 320 + index * 70, y: 130, props: { ...image.props, assetId } }
    } else store[id] = { ...draw, ...base }
  }
  return { store, schema: template.schema }
}

export function createPerformanceLibrary() {
  const root = createNoteMemoryFixture(), directory = path.join(root, 'performance')
  fs.mkdirSync(directory)
  const images = [1, 2, 3].map(index => {
    const name = `memory-${index}.png`, file = path.join(imageDirectory, name)
    fs.copyFileSync(file, path.join(root, 'attachments', name))
    return { name, bytes: fs.statSync(file).size, width: 320, height: 200 }
  })
  const scenes = { 100: sceneWithShapes(100), 1000: sceneWithShapes(1000) }
  const snapshots = Object.fromEntries(Object.entries(scenes).map(([count, scene]) => [count, Buffer.byteLength(JSON.stringify(scene))]))
  for (let index = 0; index < 1000; index++) {
    const count = index === 0 ? 100 : index === 1 ? 1000 : null
    const title = count ? `Canvas ${count}` : `Performance note ${String(index).padStart(4, '0')}`
    const config = index < 100 ? `_memnova_page_id: ${randomUUID()}\n_memnova_learning_version: 1\n_memnova_learning_enabled: true\n_memnova_back_kind: inline\n` : ''
    const back = count ? `\`\`\`tldraw id="performance-board" height="520"\n${JSON.stringify(scenes[count])}\n\`\`\`` : 'Recall this synthetic note.'
    const body = count ? a4FixtureBody().replace('# Alpha Project', `# ${title}`) : `# ${title}\n\nSynthetic ordinary content.\n`
    const source = `---\nIs A: Note\n${config}---\n${body}${index < 100 ? `\n<!-- FLASHCARD:BACK -->\n${back}\n` : ''}`
    const file = path.join(directory, `note-${String(index).padStart(4, '0')}.md`)
    fs.writeFileSync(file, source)
    const old = new Date('2025-01-01T00:00:00Z'); fs.utimesSync(file, old, old)
  }
  return { root, images, snapshots, totalMarkdownFiles: fs.readdirSync(root, { recursive: true }).filter(file => String(file).endsWith('.md')).length, syntheticNotes: 1000, enabledNotes: 100, boardFile: (count: 100 | 1000) => path.join(directory, count === 100 ? 'note-0000.md' : 'note-0001.md') }
}
