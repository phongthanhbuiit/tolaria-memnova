import { useMemo, useState } from 'react'
import type { AppLocale } from '../../lib/i18n'
import { isPublicNotePath, noteFolderPaths, noteFolderScope, workspaceDue } from '../../lib/learning/noteWorkspace'
import type { LearningWorkspace } from './LearningContext'

function searchText(value: string, locale: AppLocale) {
  return value.normalize('NFC').toLocaleLowerCase(locale)
}

export function useNoteCatalog(workspace: LearningWorkspace | null, locale: AppLocale) {
  const [folder, setFolder] = useState('')
  const [recursive, setRecursive] = useState(true)
  const [search, setSearch] = useState('')
  const [dueOnly, setDueOnly] = useState(false)
  const { pages, notes, cards, clock } = workspace ?? {}
  const due = useMemo(() => workspaceDue(pages ?? [], notes ?? [], cards ?? [], clock ?? 0),
    [pages, notes, cards, clock])
  const folders = useMemo(() => noteFolderPaths(pages ?? []), [pages])
  const currentFolder = folders.includes(folder) ? folder : ''
  const folderIds = useMemo(() => noteFolderScope(currentFolder, pages ?? [], recursive),
    [currentFolder, pages, recursive])
  const index = useMemo(() => {
    const titles = new Map(pages?.map(page => [page.id, page.title]))
    return (notes ?? []).filter(row => row.view.state !== 'ordinary' && isPublicNotePath(row.view.path)).map(row => ({
      row,
      text: searchText(`${titles.get(row.view.pageId) ?? ''}\n${row.view.path}`, locale),
    }))
  }, [pages, notes, locale])
  const folderEntries = useMemo(() => {
    const prefix = currentFolder ? `${currentFolder}/` : ''
    return index.filter(({ row: { view: { path } } }) =>
      path.startsWith(prefix) && (recursive || !path.slice(prefix.length).includes('/')))
  }, [currentFolder, recursive, index])
  const query = searchText(search.trim(), locale)
  const matchingRows = useMemo(() => folderEntries
    .filter(entry => !query || entry.text.includes(query))
    .map(entry => entry.row), [folderEntries, query])

  // A due-only display must keep the session identity when grading removes a due row.
  const scope = useMemo(() => {
    if (!query) return folderIds
    const matches = new Set(matchingRows.map(row => row.view.pageId))
    return folderIds.filter(id => matches.has(id))
  }, [folderIds, matchingRows, query])
  const dueIds = useMemo(() => new Set(due.notes.map(card => card.pageId)), [due])
  const dueRows = useMemo(() => matchingRows.filter(row => dueIds.has(row.view.pageId)), [matchingRows, dueIds])
  return {
    folders, currentFolder, setFolder, recursive, setRecursive, search, setSearch, dueOnly, setDueOnly,
    due, scope, query, hasLearningNotes: index.length > 0, hasFolderNotes: folderEntries.length > 0, dueCount: dueRows.length,
    rows: dueOnly ? dueRows : matchingRows,
  }
}
