import { useCallback, useLayoutEffect, useSyncExternalStore } from 'react'
import { editorResourceVisit, registerEditorResources, subscribeEditorResources } from './editorResourceScope'
export function useRegisterEditorResources(editor: object,vaultPath?: string,notePath?: string,viewIdentity?: string) {
  useLayoutEffect(() => {
    void viewIdentity
    return registerEditorResources(editor,vaultPath,notePath).dispose
  },[editor,vaultPath,notePath,viewIdentity])
}
export function useEditorResourceVisit(editor?: object) {
  const subscribe = useCallback((listener: () => void) => editor ? subscribeEditorResources(editor,listener) : () => {},[editor])
  const snapshot = useCallback(() => editorResourceVisit(editor),[editor])
  return useSyncExternalStore(subscribe,snapshot,snapshot)
}
