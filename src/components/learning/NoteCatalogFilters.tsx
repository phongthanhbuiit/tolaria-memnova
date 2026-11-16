import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { useId, useRef } from 'react'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import { trackEvent } from '../../lib/telemetry'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import type { useNoteCatalog } from './useNoteCatalog'

export function NoteCatalogFilters({ catalog, locale }: { catalog: ReturnType<typeof useNoteCatalog>; locale: AppLocale }) {
  const id = useId()
  const searchInput = useRef<HTMLInputElement>(null)
  const t = (key: TranslationKey) => translate(locale, key)
  return <search aria-label={t('learning.noteMemory.notes')} className="flex flex-wrap items-end gap-x-4 gap-y-3 border-y border-border py-3">
    <div className="min-w-0 flex-[2_1_15rem] space-y-1.5">
      <Label htmlFor={id + '-search'}>{t('noteList.searchAction')}</Label>
      <div className="relative">
        <MagnifyingGlass aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id + '-search'} ref={searchInput} type="search" autoComplete="off" value={catalog.search}
          placeholder={t('learning.noteMemory.searchHint')} className="ps-9 pe-10 [&::-webkit-search-cancel-button]:hidden"
          onChange={event => catalog.setSearch(event.target.value)} />
        {catalog.search && <Button type="button" variant="ghost" size="icon-sm" className="absolute end-0 top-1/2 -translate-y-1/2"
          aria-label={t('noteList.clearSearch')} onClick={() => { catalog.setSearch(''); searchInput.current?.focus() }}>
          <X aria-hidden="true" />
        </Button>}
      </div>
    </div>
    <div className="min-w-0 flex-[1_1_12rem] space-y-1.5">
      <Label htmlFor={id + '-folder'}>{t('learning.noteMemory.folder')}</Label>
      <Select value={catalog.currentFolder ? `folder:${catalog.currentFolder}` : 'root'}
        onValueChange={value => catalog.setFolder(value === 'root' ? '' : value.slice(7))}>
        <SelectTrigger id={id + '-folder'} className="w-full *:data-[slot=select-value]:truncate">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="note-memory-portal">
          <SelectItem value="root">{t('learning.library')}</SelectItem>
          {catalog.folders.map(path => <SelectItem key={path} value={`folder:${path}`}>{path}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <Switch id={id + '-recursive'} checked={catalog.recursive} onCheckedChange={catalog.setRecursive} />
        <Label htmlFor={id + '-recursive'}>{t('learning.noteMemory.includeSubfolders')}</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id={id + '-due'} checked={catalog.dueOnly} onCheckedChange={value => {
          catalog.setDueOnly(value)
          trackEvent('memnova_library_due_filter_changed', { enabled: Number(value) })
        }} />
        <Label htmlFor={id + '-due'}>{t('decks.filter.due')}</Label>
      </div>
    </div>
  </search>
}
