import type { AppLocale } from '../lib/i18n'
import type { FolderNode, SidebarSelection, VaultEntry } from '../types'
import type { FolderTab } from './folder-actions/folderActionUtils'
import { useFolderDelete } from './folder-actions/useFolderDelete'
import { useFolderRename } from './folder-actions/useFolderRename'

interface UseFolderActionsInput {
  locale?: AppLocale
  vaultPath: string
  onBeforeAction?: (prefix: string) => Promise<void>
  selection: SidebarSelection
  setSelection: (selection: SidebarSelection) => void
  setTabs: React.Dispatch<React.SetStateAction<FolderTab[]>>
  activeTabPathRef: React.MutableRefObject<string | null>
  handleSwitchTab: (path: string) => void
  closeAllTabs: () => void
  reloadVault: () => Promise<VaultEntry[]>
  reloadFolders: () => Promise<FolderNode[]>
  setToastMessage: (message: string | null) => void
}

export function useFolderActions({
  locale,
  vaultPath,
  onBeforeAction,
  selection,
  setSelection,
  setTabs,
  activeTabPathRef,
  handleSwitchTab,
  closeAllTabs,
  reloadVault,
  reloadFolders,
  setToastMessage,
}: UseFolderActionsInput) {
  const renameActions = useFolderRename({
    activeTabPathRef,
    handleSwitchTab,
    reloadFolders,
    reloadVault,
    selection,
    setSelection,
    setTabs,
    setToastMessage,
    vaultPath,
    onBeforeAction,
  })
  const deleteActions = useFolderDelete({
    activeTabPathRef,
    locale,
    clearFolderRename: renameActions.cancelFolderRename,
    closeAllTabs,
    reloadFolders,
    reloadVault,
    selection,
    setSelection,
    setTabs,
    setToastMessage,
    vaultPath,
    onBeforeAction,
  })

  return {
    ...renameActions,
    ...deleteActions,
  }
}
