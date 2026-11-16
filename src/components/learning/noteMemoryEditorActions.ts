import { normalizeNotePathForIdentity } from '../../utils/notePathIdentity'

type MnemonicEditor = () => Promise<void>
const editors = new Map<string, MnemonicEditor>()

function key(root: string, path: string) {
  return JSON.stringify([normalizeNotePathForIdentity(root), normalizeNotePathForIdentity(path)])
}

/** A mounted editor exposes its existing save-and-switch operation to Properties. */
export function registerNoteMnemonicEditor(root: string, path: string, edit: MnemonicEditor) {
  const identity = key(root, path)
  editors.set(identity, edit)
  return () => {
    if (editors.get(identity) === edit) editors.delete(identity)
  }
}

export async function requestNoteMnemonicEditor(root: string, path: string) {
  const edit = editors.get(key(root, path))
  if (!edit) throw Error('note-editor-unavailable')
  await edit()
}
