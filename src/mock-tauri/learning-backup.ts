import type { Context, Fixture } from './learning'
import type { BackupDescriptor } from '../lib/learning/types'
/** Text fixture snapshot. Native backup verification remains authoritative. */
export async function createMockLearningBackup(data: Fixture, root: string, context: Context, additionalFiles: Record<string,string> = {}): Promise<BackupDescriptor> {
  if (Object.values(data.noteMemory?.operations ?? {}).some(operation => operation.phase !== 'applied')) throw Error('pending-note-operation')
  const files: Record<string, string> = {}
  await Promise.all(data.pages.map(async page => { files[page.path] = data.restoredFiles?.[page.path] ?? await context.read(`${root}/${page.path}`) }))
  Object.assign(files, additionalFiles)
  const descriptor: BackupDescriptor = { id: crypto.randomUUID(), libraryId: data.id, createdAt: Date.now(), fileCount: Object.keys(files).length, bytes: new TextEncoder().encode(JSON.stringify(files)).length }
  const snapshot = JSON.stringify({ ...data, backups: [] })
  ;(data.backups ??= []).unshift({ descriptor, snapshot, files })
  return descriptor
}
