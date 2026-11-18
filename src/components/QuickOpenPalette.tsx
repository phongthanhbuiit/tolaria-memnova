import { resolveNoteIcon } from '../utils/noteIcon'
import { File, FileText, SlidersHorizontal } from '@phosphor-icons/react'
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import type { VaultEntry } from '../types'
import { NoteSearchList } from './NoteSearchList'
import { useNoteSearch } from '../hooks/useNoteSearch'
import { translate, type AppLocale } from '../lib/i18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus } from '@phosphor-icons/react'
import type { NoteSearchResult } from '../hooks/useNoteSearch'

interface QuickOpenPaletteProps {
  open: boolean
  entries: VaultEntry[]
  isLoading?: boolean
  onSelect: (entry: VaultEntry) => void
  onCreateNote?: (title: string) => unknown | Promise<unknown>
  onClose: () => void
  locale?: AppLocale
}

interface QuickOpenCreateActionProps {
  title: string
  onCreate: () => void | Promise<void>
  disabled: boolean
  locale: AppLocale
}

function quickOpenEmptyMessage(isLoading: boolean, locale: AppLocale): string {
  return isLoading ? translate(locale, 'status.vault.reloading') : translate(locale, 'noteList.empty.noMatching')
}

function QuickOpenCreateAction({ title, onCreate, disabled, locale }: QuickOpenCreateActionProps) {
  return (
    <div className="border-t border-border p-2">
      <Button
        type="button"
        variant="ghost"
        className="h-9 w-full justify-start gap-2 px-2 text-sm"
        disabled={disabled}
        onClick={() => { void onCreate() }}
      >
        <Plus size={14} className="shrink-0" />
        <span className="truncate">{translate(locale, 'noteList.quickOpenCreate', { title })}</span>
      </Button>
    </div>
  )
}

function useQuickOpenCreateAction({
  query,
  isLoading,
  resultCount,
  onCreateNote,
  onClose,
}: {
  query: string
  isLoading: boolean
  resultCount: number
  onCreateNote?: (title: string) => unknown
  onClose: () => void
}) {
  const [isCreating, setIsCreating] = useState(false)
  const title = query.trim()
  const canCreate = Boolean(onCreateNote && title && !isLoading && resultCount === 0)
  const create = useCallback(async () => {
    if (!canCreate || isCreating) return
    setIsCreating(true)
    try {
      const result = await onCreateNote?.(title)
      if (result !== false) onClose()
    } finally {
      setIsCreating(false)
    }
  }, [canCreate, isCreating, title, onCreateNote, onClose])

  return { canCreate, create, title, isCreating }
}

function useQuickOpenKeyboard({
  results,
  selectedIndex,
  onSelect,
  onClose,
  handleKeyDown,
  createFromQuery,
}: {
  results: NoteSearchResult[]
  selectedIndex: number
  onSelect: (entry: VaultEntry) => void
  onClose: () => void
  handleKeyDown: (e: KeyboardEvent) => void
  createFromQuery: () => void | Promise<void>
}) {
  useLayoutEffect(() => {
    const handler = (e: KeyboardEvent) => {
      handleKeyDown(e)
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = results.at(selectedIndex)
        if (selected) {
          onSelect(selected.entry)
          onClose()
        } else {
          void createFromQuery()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [results, selectedIndex, onSelect, onClose, handleKeyDown, createFromQuery])
}

export function QuickOpenPalette({ open, ...props }: QuickOpenPaletteProps) {
  return open ? <OpenQuickOpenPalette {...props} /> : null
}

function OpenQuickOpenPalette({ entries, isLoading = false, onSelect, onCreateNote, onClose, locale = 'en' }: Omit<QuickOpenPaletteProps, 'open'>) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const { results, selectedIndex, setSelectedIndex, handleKeyDown } = useNoteSearch(entries, query)
  const createAction = useQuickOpenCreateAction({ query, isLoading, resultCount: results.length, onCreateNote, onClose })

  useLayoutEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  useQuickOpenKeyboard({ results, selectedIndex, onSelect, onClose, handleKeyDown, createFromQuery: createAction.create })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const handleRootClick = (event: MouseEvent) => {
      if (event.target === root) onClose()
    }

    root.addEventListener('click', handleRootClick)
    return () => root.removeEventListener('click', handleRootClick)
  }, [onClose])

  return (
    <div
      ref={rootRef}
      data-testid="quick-open-palette"
      className="fixed inset-0 z-[1000] flex justify-center bg-[var(--shadow-dialog)] pt-[15vh]"
    >
      <Button variant="bare"
        type="button"
        aria-label={translate(locale, 'a11y.closeQuickOpen')}
        className="absolute inset-0 z-0 cursor-default border-0 bg-transparent p-0"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex w-[500px] max-w-[90vw] max-h-[min(400px,80vh)] flex-col self-start overflow-hidden rounded-xl border border-[var(--border-dialog)] bg-popover shadow-[0_8px_32px_var(--shadow-dialog)]"
      >
        <Input
          ref={inputRef}
          className="h-auto shrink-0 rounded-none border-0 border-b border-border px-4 py-3 text-(length:--text-body-lg) leading-(--text-body-lg--line-height) shadow-none focus-visible:ring-0"
          type="text"
          placeholder={translate(locale, 'noteList.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <NoteSearchList
          items={results.map(result => {
            const { entry } = result
            const isView = entry.view || /(?:^|[\\/])views[\\/][^\\/]+\.ya?ml$/i.test(entry.path)
            const kind = isView ? 'view' : entry.fileKind && entry.fileKind !== 'markdown' ? 'file' : entry.isA === 'Type' ? 'type' : null
            const fallbackIcon = kind === 'view' ? SlidersHorizontal : kind === 'file' ? File : result.TypeIcon ?? FileText
            return {
              ...result,
              noteType: kind ? translate(locale, `quickOpen.kind.${kind}`) : result.noteType,
              TypeIcon: resolveNoteIcon(result.noteIcon).kind === 'none' ? fallbackIcon : undefined,
            }
          })}
          neutralBadges
          selectedIndex={selectedIndex}
          getItemKey={(item) => item.entry.path}
          onItemClick={(item) => {
            onSelect(item.entry)
            onClose()
          }}
          onItemHover={(i) => setSelectedIndex(i)}
          emptyMessage={quickOpenEmptyMessage(isLoading, locale)}
          className="app-scrollbar min-h-0 max-h-[calc(8*var(--control-md)+2*var(--spacing))] overflow-x-hidden overflow-y-auto"
        />
        {createAction.canCreate && (
          <QuickOpenCreateAction
            title={createAction.title}
            onCreate={createAction.create}
            disabled={createAction.isCreating}
            locale={locale}
          />
        )}
      </div>
    </div>
  )
}
