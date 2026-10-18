/** Read-only text model. Binary media verification and SQLite guarantees are native tests. */
import type { Context, Fixture } from './learning'
import { hasMockPendingNote, mockNotePath } from './note-memory'
import { parseNoteMemoryDocument } from '../lib/learning/noteMemoryDocument'
import type { NoteSourcePreview } from '../lib/learning/types'

type Hash = (source: string) => Promise<string>
async function identity(root: string, data: Fixture, context: Context, path: string, id: string | null): Promise<void> {
  const registered = data.pages.find(page => page.path === path)
  for (const pageId of new Set([id, registered?.id])) {
    if (pageId && hasMockPendingNote(data, pageId)) throw Error('pending-note-operation')
  }
  if (!id && registered && data.noteMemory?.bindings[registered.id]) throw Error('changed-page-identity')
  if (id) {
    const sources = data.restoredFiles ? Object.values(data.restoredFiles) : context.allContent ? Object.entries(await context.allContent()).filter(([file]) => file.startsWith(`${root}/`)).map(([,source]) => source) : null
    if (sources && sources.filter(source => parseNoteMemoryDocument(source).pageId === id).length !== 1) throw Error('identity-conflict')
  }
}
export async function mockNoteSourcePreview(root: string, data: Fixture, context: Context, request: Record<string, unknown>, hash: Hash): Promise<NoteSourcePreview> {
  if (Object.keys(request).some(key => !['kind','path','face'].includes(key)) || typeof request.path !== 'string' || !['front','back'].includes(String(request.face))) throw Error('Invalid source preview request')
  const path = request.path, absolute = mockNotePath(root,path)
  const source = data.restoredFiles?.[path] ?? await context.read(absolute)
  const doc = parseNoteMemoryDocument(source)
  if (doc.issues.length) throw Error('invalid-source-document')
  const hasBack = Boolean(doc.offsets.back), backLinked = doc.config?.back.kind === 'page'
  if (request.face === 'back' && backLinked) throw Error('recursive-back-source')
  if (request.face === 'back' && !hasBack) throw Error('missing-source-back')
  await identity(root,data,context,path,doc.pageId)
  const face = request.face === 'back' ? 'back' : 'front', content = doc[face]
  const fingerprint = await hash(JSON.stringify({path,face,content,media:[],hasBack,backLinked}))
  return {pageId:doc.pageId,path,face,content,sourceHash:await hash(source),fingerprint,media:[],hasBack,backLinked}
}
