import { normalizeNotePathForIdentity } from '../../utils/notePathIdentity'
interface SourceTab {
  entry: { path: string }
  content: string
}
export interface NoteSourceRefresh {
  path: string
  before: string
  after: string
}

export async function readNoteSourceRefresh(
  tabs: SourceTab[],
  root: string,
  dirty: (path: string) => boolean,
  read: (path: string) => Promise<string>
): Promise<NoteSourceRefresh[]> {
  const prefix = `${normalizeNotePathForIdentity(root)}/`
  return Promise.all(
    tabs
      .filter(
        (tab) =>
          normalizeNotePathForIdentity(tab.entry.path).startsWith(prefix) &&
          !dirty(tab.entry.path)
      )
      .map(async (tab) => ({
        path: tab.entry.path,
        before: tab.content,
        after: await read(tab.entry.path),
      }))
  )
}

/** A conversion/recovery reload may update a clean snapshot, never a newer local draft. */
export function applyNoteSourceRefresh<T extends SourceTab>(
  tabs: T[],
  updates: NoteSourceRefresh[]
): T[] {
  const byPath = new Map(
    updates.map((update) => [normalizeNotePathForIdentity(update.path), update])
  )
  let changed = false
  const next = tabs.map((tab) => {
    const update = byPath.get(normalizeNotePathForIdentity(tab.entry.path))
    if (
      !update ||
      tab.content !== update.before ||
      update.after === tab.content
    )
      return tab
    changed = true
    return { ...tab, content: update.after }
  })
  return changed ? next : tabs
}
