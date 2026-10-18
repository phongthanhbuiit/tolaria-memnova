import { useCallback, useLayoutEffect, useSyncExternalStore } from 'react'
import { editorResourceVisit, registerEditorResources, subscribeEditorResources } from './editorResourceScope'
export function useRegisterEditorResources(editor: object,vaultPath?: string,notePath?: string) {
  useLayoutEffect(() => registerEditorResources(editor,vaultPath,notePath).dispose,[editor,vaultPath,notePath])
}
export function useEditorResourceVisit(editor?: object) {
  const subscribe = useCallback((listener: () => void) => editor ? subscribeEditorResources(editor,listener) : () => {},[editor])
  const snapshot = useCallback(() => editorResourceVisit(editor),[editor])
  return useSyncExternalStore(subscribe,snapshot,snapshot)
}
