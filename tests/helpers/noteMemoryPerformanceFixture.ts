import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { a4FixtureBody, createNoteMemoryFixture } from './noteMemoryFixture'

interface Scene { type: string; version: number; elements: Array<Record<string, unknown>>; files: Record<string, unknown> }
const imageDirectory = path.resolve('tests/fixtures/performance')
const syntaxShapeIds: Record<number, string> = { 3: 'shape:LhZ-_aBWyGPVitl6TCMFW', 4: 'shape:BvUmrZiWDexrb57Za_Il_' }

export function readPerformanceScene(file: string): Scene {
  const match = /```excalidraw[^\n]*\n([\s\S]*?)\n```/.exec(fs.readFileSync(file, 'utf8'))
  if (!match) throw new Error('Missing performance canvas')
  return JSON.parse(match[1]) as Scene
}
export function performanceShapeCount(file: string): number {
  return readPerformanceScene(file).elements.filter(element => !element.isDeleted).length
}

function sceneWithShapes(count: number): Scene {
  const scene: Scene = JSON.parse(fs.readFileSync('tests/fixtures/note-memory-study-canvas.json','utf8'))
  const template = scene.elements[0]
  scene.elements = Array.from({length: count}, (_, index) => {
    const element = {...template, id: syntaxShapeIds[index] ?? String(index), x: index % 40 * 12, y: Math.floor(index / 40) * 12}
    if (index >= 3) return element
    const fileId = 'performance' + index
    const bytes = fs.readFileSync(path.join(imageDirectory, 'memory-' + (index+1) + '.png'))
    scene.files[fileId] = {id:fileId, mimeType:'image/png', dataURL:'data:image/png;base64,' + bytes.toString('base64'), created:1}
    return {...element, type:'image', fileId, scale:[1,1], status:'saved'}
  })
  return scene
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
    const back = count ? `\`\`\`excalidraw id="performance-board" height="520"\n${JSON.stringify(scenes[count])}\n\`\`\`` : 'Recall this synthetic note.'
    const body = count ? a4FixtureBody().replace('# Alpha Project', `# ${title}`) : `# ${title}\n\nSynthetic ordinary content.\n`
    const source = `---\nIs A: Note\n${config}---\n${body}${index < 100 ? `\n<!-- FLASHCARD:BACK -->\n${back}\n` : ''}`
    const file = path.join(directory, `note-${String(index).padStart(4, '0')}.md`)
    fs.writeFileSync(file, source)
    const old = new Date('2025-01-01T00:00:00Z'); fs.utimesSync(file, old, old)
  }
  return { root, images, snapshots, totalMarkdownFiles: fs.readdirSync(root, { recursive: true }).filter(file => String(file).endsWith('.md')).length, syntheticNotes: 1000, enabledNotes: 100, boardFile: (count: 100 | 1000) => path.join(directory, count === 100 ? 'note-0000.md' : 'note-0001.md') }
}
