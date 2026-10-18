export interface EditorResourceVisit {
  vaultPath?: string
  notePath?: string
  isCurrent: () => boolean
  dispose: () => void
}
const visits = new WeakMap<object,EditorResourceVisit>()
const listeners = new WeakMap<object,Set<() => void>>()
export function editorResourceVisit(editor?: object): EditorResourceVisit | null { return editor ? visits.get(editor) ?? null : null }
function notify(editor: object) { listeners.get(editor)?.forEach(listener => listener()) }
export function registerEditorResources(editor: object,vaultPath?: string,notePath?: string): EditorResourceVisit {
  const visit: EditorResourceVisit = {
    vaultPath,notePath,isCurrent: () => visits.get(editor) === visit,
    dispose: () => { if (visits.get(editor) === visit) { visits.delete(editor); notify(editor) } },
  }
  visits.set(editor,visit); notify(editor)
  return visit
}
export function subscribeEditorResources(editor: object,listener: () => void): () => void {
  let current = listeners.get(editor)
  if (!current) { current = new Set(); listeners.set(editor,current) }
  const subscriptions = current
  subscriptions.add(listener)
  return () => { subscriptions.delete(listener); if (!subscriptions.size) listeners.delete(editor) }
}

export function createResourceLifetime(identity: object) {
  let active = true
  return { identity,isActive: () => active,activate: () => { active = true },deactivate: () => { active = false } }
}
