import { useCallback, useState } from 'react'
import { translate, type AppLocale } from '../../lib/i18n'
import type { SidebarSelection, VaultEntry } from '../../types'
import {
  clearDeletedFolderTabs,
  type ConfirmFolderDeleteState,
  type FolderTab,
  folderLabel,
  folderAbsolutePath,
  invokeDeleteFolder,
  resetSelectionIfFolderDeleted,
} from './folderActionUtils'

interface UseFolderDeleteInput {
  locale?: AppLocale
  activeTabPathRef: React.MutableRefObject<string | null>
  clearFolderRename: () => void
  closeAllTabs: () => void
  reloadFolders: () => Promise<unknown>
  reloadVault: () => Promise<VaultEntry[]>
  selection: SidebarSelection
  setSelection: (selection: SidebarSelection) => void
  setTabs: React.Dispatch<React.SetStateAction<FolderTab[]>>
  setToastMessage: (message: string | null) => void
  vaultPath: string
  onBeforeAction?: (prefix: string) => Promise<void>
}

export function useFolderDelete({
  locale = 'en',
  activeTabPathRef,
  clearFolderRename,
  closeAllTabs,
  reloadFolders,
  reloadVault,
  selection,
  setSelection,
  setTabs,
  setToastMessage,
  vaultPath,
  onBeforeAction,
}: UseFolderDeleteInput) {
  const [confirmDeleteFolder, setConfirmDeleteFolder] =
    useState<ConfirmFolderDeleteState | null>(null)

  const requestDeleteFolder = useCallback(
    (folderPath: string) => {
      clearFolderRename()
      setConfirmDeleteFolder({
        path: folderPath,
        title: `Delete "${folderLabel({ folderPath })}" and everything inside it?`,
        message: translate(
          locale,
          'editor.noteMemory.deleteFolderConfirmation'
        ),
        confirmLabel: 'Delete folder',
      })
    },
    [clearFolderRename, locale]
  )

  const cancelDeleteFolder = useCallback(() => setConfirmDeleteFolder(null), [])

  const confirmDeleteSelectedFolder = useCallback(async () => {
    if (!confirmDeleteFolder) return

    const folderPath = confirmDeleteFolder.path
    try {
      await onBeforeAction?.(folderAbsolutePath({ vaultPath, folderPath }))
      setConfirmDeleteFolder(null)
      await invokeDeleteFolder({ vaultPath, folderPath })
      clearDeletedFolderTabs({
        activeTabPathRef,
        closeAllTabs,
        folderPath,
        setTabs,
        vaultPath,
      })
      await reloadFolders()
      const refreshedEntries = await reloadVault()
      resetSelectionIfFolderDeleted({
        folderPath,
        refreshedEntries,
        selection,
        setSelection,
        vaultPath,
      })
      setToastMessage(`Deleted folder "${folderLabel({ folderPath })}"`)
    } catch (error) {
      setToastMessage(`Failed to delete folder: ${error}`)
    }
  }, [
    onBeforeAction,
    activeTabPathRef,
    closeAllTabs,
    confirmDeleteFolder,
    reloadFolders,
    reloadVault,
    selection,
    setSelection,
    setTabs,
    setToastMessage,
    vaultPath,
  ])

  const deleteSelectedFolder = useCallback(() => {
    if (selection.kind !== 'folder' || !selection.path) return
    requestDeleteFolder(selection.path)
  }, [requestDeleteFolder, selection])

  return {
    cancelDeleteFolder,
    confirmDeleteFolder,
    confirmDeleteSelectedFolder,
    deleteSelectedFolder,
    requestDeleteFolder,
  }
}
