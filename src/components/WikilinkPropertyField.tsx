import { useCallback, useMemo, useState, type ElementType } from 'react'
import { X } from '@phosphor-icons/react'
import type { VaultEntry } from '../types'
import { parseVocabularyLinks } from '../lib/learning/vocabulary'
import { translate, type AppLocale } from '../lib/i18n'
import { NoteAutocomplete } from './NoteAutocomplete'
import { Button } from './ui/button'

interface Props {
  id: string; label: string; icon: ElementType; value: string; placeholder: string
  entries?: VaultEntry[]; typeEntryMap?: Record<string, VaultEntry>; locale?: AppLocale; disabled?: boolean
  onAdd: (target: string) => void; onRemove: (target: string) => void; onNavigate?: (target: string) => void
}
export function WikilinkPropertyField({ id, label, icon: Icon, value, placeholder, entries = [], typeEntryMap = {}, locale = 'en', disabled = false, onAdd, onRemove, onNavigate }: Props) {
  const [query, setQuery] = useState('')
  const targets = useMemo(() => parseVocabularyLinks(value), [value])
  const select = useCallback((title: string) => { onAdd(title); setQuery('') }, [onAdd])
  return <div className="flex flex-col gap-1">
    <label htmlFor={id} className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Icon size={12} />{label}</label>
    {targets.length > 0 && <div className="my-1 flex flex-wrap gap-1">{targets.map(target => <span key={target} className="inline-flex items-center gap-1 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-xs text-foreground">
      {onNavigate ? <Button type="button" variant="link" className="h-auto max-w-40 truncate p-0 text-xs" disabled={disabled} onClick={() => onNavigate(target)}>{target}</Button> : <span className="max-w-40 truncate">{target}</span>}
      <Button type="button" variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" disabled={disabled} aria-label={`${translate(locale, 'common.remove')} ${target}`} onClick={() => onRemove(target)}><X size={10} weight="bold" /></Button>
    </span>)}</div>}
    <NoteAutocomplete inputId={id} disabled={disabled} entries={entries} typeEntryMap={typeEntryMap} value={query} onChange={setQuery} onSelect={select} placeholder={placeholder} testId={id} />
  </div>
}
