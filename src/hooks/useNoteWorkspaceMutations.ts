import { useCallback, useLayoutEffect, useRef } from 'react'
import type { LearningClient } from '../lib/learning/client'
import type { NoteLearningSummary } from '../lib/learning/types'
import { NoteWorkspaceMutations } from '../lib/learning/noteWorkspaceMutations'
import { registerNoteWorkspacePropertyWriter } from '../lib/learning/noteEditorPersistence'
import { loadNoteContent } from './useNoteRename'
import { joinVaultPath, notePathsMatch } from '../utils/notePathIdentity'

interface Options {
  client: LearningClient | null
  notes: NoteLearningSummary[]
  flush: (path: string) => Promise<unknown>
  onSaved: (path: string, before: string, after: string) => void
  refresh: () => Promise<unknown>
}
export function useNoteWorkspaceMutations(options: Options) {
  const callbacks = useRef(options),
    current = useRef<NoteWorkspaceMutations | null>(null)
  const client = options.client
  useLayoutEffect(() => {
    callbacks.current = options
  })
  useLayoutEffect(() => {
    if (!client?.supportsNoteMemory) return
    const service = new NoteWorkspaceMutations({
      client,
      read: (path) => loadNoteContent({ path }),
      flush: (path) => callbacks.current.flush(path),
      onSaved: (path, before, after) =>
        callbacks.current.onSaved(path, before, after),
      owns: (path) =>
        callbacks.current.notes.some(
          (row) =>
            row.view.binding &&
            notePathsMatch(joinVaultPath(client.vaultPath, row.view.path), path)
        ),
    })
    current.current = service
    const unregister = registerNoteWorkspacePropertyWriter(
      client.vaultPath,
      async (path, key, value) => {
        const result = await service.property(path, key, value)
        if (result !== null && current.current === service)
          await callbacks.current.refresh()
        return result
      }
    )
    return () => {
      unregister()
      service.dispose()
      if (current.current === service) current.current = null
    }
  }, [client])
  return useCallback(async (path: string, enabled: boolean) => {
    const service = current.current
    if (!service) throw Error('note-workspace-unavailable')
    await service.setEnabled(path, enabled)
    if (current.current === service) await callbacks.current.refresh()
  }, [])
}
