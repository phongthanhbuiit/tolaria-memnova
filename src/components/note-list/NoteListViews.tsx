import { createContext, memo, useContext, useMemo } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import type { VaultEntry } from '../../types'
import type { SortOption, SortDirection, SortConfig, RelationshipGroup } from '../../utils/noteListHelpers'
import { translate, type AppLocale } from '../../lib/i18n'
import { PinnedCard } from './PinnedCard'
import { RelationshipGroupSection } from './RelationshipGroupSection'
import { EmptyMessage } from './TrashWarningBanner'

function resolveEmptyText({
  isChangesView,
  changesError,
  isArchivedView,
  isInboxView,
  query,
  locale,
}: {
  isChangesView: boolean
  changesError: string | null | undefined
  isArchivedView: boolean
  isInboxView: boolean
  query: string
  locale: AppLocale
}): string {
  if (isChangesView && changesError) return translate(locale, 'noteList.empty.changesError', { error: changesError })
  if (isChangesView) return translate(locale, 'noteList.empty.noChanges')
  if (isArchivedView) return translate(locale, 'noteList.empty.noArchived')
  if (isInboxView) return query ? translate(locale, 'noteList.empty.noMatching') : translate(locale, 'noteList.empty.allOrganized')
  return query ? translate(locale, 'noteList.empty.noMatching') : translate(locale, 'noteList.empty.noNotes')
}

export function EntityView({ entity, groups, query, collapsedGroups, sortPrefs, onToggleGroup, onSortChange, renderItem, locale = 'en' }: {
  entity: VaultEntry; groups: RelationshipGroup[]; query: string
  collapsedGroups: Set<string>; sortPrefs: Record<string, SortConfig>
  onToggleGroup: (label: string) => void; onSortChange: (label: string, opt: SortOption, dir: SortDirection) => void
  renderItem: (entry: VaultEntry, options?: { forceSelected?: boolean }) => React.ReactNode
  locale?: AppLocale
}) {
  return (
    <div className="app-scrollbar h-full overflow-y-auto">
      <PinnedCard entry={entity} renderItem={renderItem} />
      {groups.length === 0
        ? <EmptyMessage text={query ? translate(locale, 'noteList.empty.noMatchingItems') : translate(locale, 'noteList.empty.noRelatedItems')} />
        : groups.map((group) => (
          <RelationshipGroupSection key={group.label} group={group} isCollapsed={collapsedGroups.has(group.label)} sortPrefs={sortPrefs} locale={locale} onToggle={() => onToggleGroup(group.label)} handleSortChange={onSortChange} renderItem={renderItem} />
        ))
      }
    </div>
  )
}

type NoteRenderer = (entry: VaultEntry) => React.ReactNode
const NoteRendererContext = createContext<(path: string) => React.ReactNode>(() => null)

function NoteRow({ entry }: { entry: VaultEntry }) {
  const renderItem = useContext(NoteRendererContext)
  return renderItem(entry.path)
}

function renderNoteRow(_index: number, entry: VaultEntry) {
  return <NoteRow entry={entry} />
}

function noteRowKey(_index: number, entry: VaultEntry) {
  return entry.path
}

// Virtuoso owns ordering; rows read current metadata from context. Replaying a
// metadata transition must not republish data into its layout subscriptions.
const VirtualNoteList = memo(function VirtualNoteList({ entries, virtuosoRef }: {
  entries: VaultEntry[]
  virtuosoRef?: React.RefObject<VirtuosoHandle | null>
}) {
  return (
    <Virtuoso
      ref={virtuosoRef}
      className="app-scrollbar"
      style={{ height: '100%' }}
      data={entries}
      computeItemKey={noteRowKey}
      overscan={200}
      itemContent={renderNoteRow}
    />
  )
}, (previous, next) => previous.virtuosoRef === next.virtuosoRef
  && previous.entries.length === next.entries.length
  && previous.entries.every((entry, index) => entry.path === next.entries[index].path))

export function ListView({ isArchivedView, isChangesView, isInboxView, changesError, searched, query, renderItem, virtuosoRef, locale = 'en' }: {
  isArchivedView?: boolean; isChangesView?: boolean; isInboxView?: boolean; changesError?: string | null
  searched: VaultEntry[]; query: string
  renderItem: NoteRenderer
  virtuosoRef?: React.RefObject<VirtuosoHandle | null>
  locale?: AppLocale
}) {
  const renderPath = useMemo(() => {
    const entriesByPath = new Map(searched.map(entry => [entry.path, entry]))
    return (path: string) => {
      const entry = entriesByPath.get(path)
      return entry ? renderItem(entry) : null
    }
  }, [searched, renderItem])
  const emptyText = resolveEmptyText({
    isChangesView: !!isChangesView,
    changesError: changesError ?? null,
    isArchivedView: !!isArchivedView,
    isInboxView: !!isInboxView,
    query,
    locale,
  })

  if (searched.length === 0) {
    return (
      <div className="app-scrollbar h-full overflow-y-auto">
        <EmptyMessage text={emptyText} />
      </div>
    )
  }

  return (
    <NoteRendererContext.Provider value={renderPath}>
      <VirtualNoteList entries={searched} virtuosoRef={virtuosoRef} />
    </NoteRendererContext.Provider>
  )
}
