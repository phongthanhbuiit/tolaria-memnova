import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { SidebarSelection, VaultEntry } from '../../types'
import { normalizeNotePathForIdentity, notePathsMatch } from '../../utils/notePathIdentity'
import type { ResolveViewStudyScope } from '../../lib/learning/noteWorkspace'

export interface SavedViewStudy {
  root: string
  dueByPath: ReadonlyMap<string, string>
  start: (resolveScope: ResolveViewStudyScope) => void | Promise<void>
}

function dueId(entry: VaultEntry, root: string, dueByPath: ReadonlyMap<string, string>) {
  if (entry.workspace && !notePathsMatch(entry.workspace.path, root)) return undefined
  return dueByPath.get(normalizeNotePathForIdentity(entry.path))
}

export function useSavedViewStudy(
  selection: SidebarSelection,
  entries: VaultEntry[],
  loading: boolean,
  study?: SavedViewStudy,
) {
  const root = study?.root
  const key = root && selection.kind === 'view' ? JSON.stringify([root, selection.rootPath, selection.filename]) : null
  const [filteredViews, setFilteredViews] = useState<ReadonlySet<string>>(() => new Set())
  const [starting, setStarting] = useState<null | object>(null)
  const filterOn = key !== null && filteredViews.has(key)
  const visit = useMemo(() => ({ key }), [key])
  const current = useRef<{ visit: typeof visit; entries: VaultEntry[]; pending: boolean } | null>(null)
  useLayoutEffect(() => {
    current.current = { visit, entries: [], pending: false }
    return () => { current.current = null }
  }, [visit])
  useLayoutEffect(() => {
    if (current.current) current.current.entries = loading ? [] : entries
  }, [visit, entries, loading])
  const due = useMemo(() => key && study
    ? entries.filter(entry => dueId(entry, study.root, study.dueByPath))
    : [], [entries, key, study])

  if (!key || !study) return { entries, controls: null }
  const resolveScope: ResolveViewStudyScope = freshDue => {
    if (current.current?.visit !== visit) return []
    const ids = current.current.entries.flatMap(entry => {
      const id = dueId(entry, study.root, freshDue)
      return id ? [id] : []
    })
    return [...new Set(ids)]
  }
  const start = async () => {
    if (loading || !due.length || current.current?.visit !== visit || current.current.pending) return
    current.current.pending = true
    setStarting(visit)
    try {
      await study.start(resolveScope)
    } finally {
      if (current.current?.visit === visit) current.current.pending = false
      setStarting(current => current === visit ? null : current)
    }
  }
  const toggle = (checked: boolean) => setFilteredViews(previous => {
    const next = new Set(previous)
    if (checked) next.add(key)
    else next.delete(key)
    return next
  })
  return {
    entries: filterOn ? due : entries,
    controls: { filterOn, toggle, count: due.length, loading: loading || starting === visit, start },
  }
}
