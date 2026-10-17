import { useEffect, useId, useRef, useState } from 'react'
import { NoteAutocomplete } from '../NoteAutocomplete'
import { SourcePagePreview } from './SourcePagePreview'
import { translate, type AppLocale } from '../../lib/i18n'
import type { LearningPage } from '../../lib/learning/types'
import { useLearningWorkspace } from './LearningContext'

export function SourcePagePicker({ value, locale, disabled, onChange, onBusyChange, label }: { value: string | null; locale: AppLocale; disabled: boolean; onChange: (page: LearningPage) => void; onBusyChange?: (busy: boolean) => void; label?: string }) {
  const workspace = useLearningWorkspace()
  const client = workspace?.client
  const root = workspace?.root ?? client?.vaultPath ?? ''
  const id = useId()
  const [query, setQuery] = useState('')
  const [choice, setChoice] = useState<{ root: string; page: LearningPage } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const active = useRef<object | null>(null)
  const locked = useRef(false)
  const busyCallback = useRef(onBusyChange)
  useEffect(() => { busyCallback.current = onBusyChange }, [onBusyChange])
  useEffect(() => {
    const visit = {}; active.current = visit; locked.current = false
    setBusy(false); busyCallback.current?.(false); setError(null); setQuery('')
    return () => { if (active.current === visit) { active.current = null; busyCallback.current?.(false) } }
  }, [client, root])
  const selected = workspace?.pages.find(page => page.id === value) ?? (choice?.root === root && choice.page.id === value ? choice.page : null)
  const entries = (workspace?.entries ?? []).filter(entry => entry.path.startsWith(`${root}/`) && /\.(md|markdown)$/i.test(entry.path))
  const choose = async (path: string) => {
    const visit = active.current
    if (!workspace || !client || !visit || disabled || locked.current || !entries.some(entry => entry.path === path)) return
    locked.current = true; setBusy(true); busyCallback.current?.(true); setError(null)
    try {
      await workspace.flush()
      if (active.current !== visit) return
      const page = await client.ensurePage(path.slice(root.length + 1))
      if (active.current !== visit) return
      setChoice({ root, page }); setQuery(''); onChange(page)
      await workspace.refresh()
    } catch (error) { if (active.current === visit) setError(String(error)) }
    finally { if (active.current === visit) { locked.current = false; setBusy(false); busyCallback.current?.(false) } }
  }
  return <div className="space-y-2 text-sm">
    <label htmlFor={id} className="font-medium">{label ?? translate(locale, 'learning.sourcePage')}</label>
    <NoteAutocomplete inputId={id} selectByPath entries={entries} typeEntryMap={{}} value={query} onChange={setQuery} onSelect={path => { void choose(path) }} disabled={disabled || busy} placeholder={translate(locale, 'learning.addRelated')} />
    {selected && <div className="rounded-md border bg-muted/30 p-3"><SourcePagePreview pageId={selected.id} title={selected.title} locale={locale} disabled={disabled || !selected.available} /><p className="mt-1 break-all text-xs text-muted-foreground">{selected.path}</p></div>}
    {value && !selected?.available && <p role="alert" className="text-destructive">{translate(locale, 'learning.sourceUnavailable')}</p>}
    {error && <pre role="alert" className="whitespace-pre-wrap break-words text-xs text-destructive">{error}</pre>}
    {busy && <p role="status">{translate(locale, 'learning.loading')}</p>}
  </div>
}
