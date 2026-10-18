/** Text/identity browser model. Native filesystem/SQLite tests own durability evidence. */
import type { Context, Fixture } from './learning'
import type {
  LearningPage,
  LearningSchedule,
  NoteMemoryView,
  NoteWorkspaceSnapshot,
} from '../lib/learning/types'
import { parseNoteMemoryDocument } from '../lib/learning/noteMemoryDocument'
import { mockNoteMemoryCommand } from './note-memory'
interface Environment {
  data: Fixture
  root: string
  context: Context
  fresh: () => LearningSchedule
  hash: (source: string) => Promise<string>
  persist: () => void
}
async function catalog(env: Environment) {
  const entries = await env.context.entries()
  const paths = new Set(
    [
      ...env.data.pages.map((page) => `${env.root}/${page.path}`),
      ...entries.map((entry) => entry.path),
    ].filter(
      (path) =>
        path.startsWith(`${env.root}/`) &&
        /\.m(?:d|arkdown)$/i.test(path) &&
        !path.includes('/.memnova/')
    )
  )
  const texts = new Map<string, string>(),
    sources = new Map<string, { path: string; title: string }>(),
    duplicate = new Set<string>()
  const all = env.context.allContent ? await env.context.allContent() : null
  for (const absolute of paths) {
    const path = absolute.slice(env.root.length + 1)
    let source: string
    try {
      source =
        env.data.restoredFiles?.[path] ??
        all?.[absolute] ??
        (await env.context.read(absolute))
    } catch {
      continue
    }
    texts.set(path, source)
    const id = parseNoteMemoryDocument(source).pageId
    if (!id || duplicate.has(id)) continue
    if (sources.has(id)) {
      sources.delete(id)
      duplicate.add(id)
      continue
    }
    sources.set(id, {
      path,
      title:
        entries.find((entry) => entry.path === absolute)?.title ??
        env.data.pages.find((page) => page.id === id)?.title ??
        path.split('/').at(-1) ??
        path,
    })
  }
  return {
    texts,
    sources,
    matches: (id: string, path: string) => sources.get(id)?.path === path,
  }
}
export async function mockNoteWorkspace(
  env: Environment
): Promise<NoteWorkspaceSnapshot> {
  const index = await catalog(env)
  for (const page of env.data.pages) {
    if (index.sources.has(page.id) || page.path.startsWith('.memnova/retired/'))
      continue
    const replacement = [...index.sources].find(
      ([, source]) => source.path === page.path
    )?.[0]
    if (
      !index.texts.has(page.path) ||
      (replacement && replacement !== page.id)
    ) {
      page.available = false
      page.path = `.memnova/retired/${page.id}.md`
    }
  }
  for (const [id, source] of index.sources) {
    const page = env.data.pages.find((page) => page.id === id)
    if (page) {
      page.path = source.path
      page.title = source.title
      page.available = true
    } else
      env.data.pages.push({
        id,
        path: source.path,
        title: source.title,
        available: true,
        createdAt: null,
        modifiedAt: null,
      })
  }
  const scoped = { ...env, identityMatches: index.matches }
  const notes: NoteWorkspaceSnapshot['notes'] = []
  for (const page of env.data.pages) {
    let view = (await mockNoteMemoryCommand(scoped, {
      kind: 'readNoteMemory',
      pageId: page.id,
    })) as NoteMemoryView
    if (!page.available) view = { ...view, state: 'deleted' }
    if (view.state !== 'pending' && (view.binding || view.config))
      view = (await mockNoteMemoryCommand(scoped, {
        kind: 'reconcileNoteMemory',
        pageId: page.id,
      })) as NoteMemoryView
    if (
      view.state === 'ordinary' &&
      !view.config &&
      !view.binding &&
      !view.legacyCardCount
    )
      continue
    notes.push({
      view,
      card: view.binding
        ? (env.data.cards.find((card) => card.id === view.binding?.cardId) ??
          null)
        : null,
    })
  }
  const pages: LearningPage[] = env.data.pages.map((page) => ({
    ...page,
    available: page.available && index.matches(page.id, page.path),
  }))
  return { pages, notes }
}
