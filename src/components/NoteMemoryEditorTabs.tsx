import { BookOpen, Copy, PencilSimpleLine, Plus } from '@phosphor-icons/react'
import { useState, type KeyboardEvent } from 'react'
import { Button } from './ui/button'
import { translate, type AppLocale } from '../lib/i18n'
import { writeClipboardText } from '../utils/clipboardText'
import type { MemoryFace } from '../lib/learning/noteMemoryConfig'

interface NoteMemoryEditorTabsProps {
  activeFace: MemoryFace
  hasBack: boolean
  panelId: string
  locale: AppLocale
  onChangeFace: (face: MemoryFace) => void
  onAddBack: () => void
  conflict?: boolean
  draft?: () => string
}

function destination(key: string, current: number, count: number): number | null {
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === 'ArrowRight') return (current + 1) % count
  if (key === 'ArrowLeft') return (current + count - 1) % count
  return null
}

/** Face navigation is a view change; the owner keeps the one canonical document. */
export function NoteMemoryEditorTabs(props: NoteMemoryEditorTabsProps) {
  const { activeFace, hasBack, panelId, locale, onChangeFace, onAddBack, conflict, draft } = props
  const [error, setError] = useState(false)
  const change = (face: MemoryFace): boolean => {
    try { onChangeFace(face); setError(false); return true }
    catch { setError(true); return false }
  }
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    const current = tabs.indexOf(event.target as HTMLButtonElement)
    if (current < 0) return
    const next = destination(event.key, current, tabs.length)
    if (next === null) return
    event.preventDefault()
    if (change(next === 0 ? 'front' : 'back')) tabs[next].focus()
  }
  return <div className="border-b border-border bg-muted/30">
    <div role="tablist" aria-label={translate(locale, 'learning.content')} onKeyDown={navigate} className="flex flex-wrap items-center gap-1 px-3 py-1.5">
      <Button id={`${panelId}-front`} role="tab" aria-selected={activeFace === 'front'} aria-controls={panelId} tabIndex={activeFace === 'front' ? 0 : -1} size="sm" variant={activeFace === 'front' ? 'secondary' : 'ghost'} onClick={() => change('front')}><BookOpen aria-hidden="true" />{translate(locale, 'learning.noteMemory.article')}</Button>
      {hasBack ? <Button id={`${panelId}-back`} role="tab" aria-selected={activeFace === 'back'} aria-controls={panelId} tabIndex={activeFace === 'back' ? 0 : -1} size="sm" variant={activeFace === 'back' ? 'secondary' : 'ghost'} onClick={() => change('back')}><PencilSimpleLine aria-hidden="true" />{translate(locale, 'learning.noteMemory.mnemonic')}</Button> : <Button size="sm" variant="outline" onClick={() => { try { onAddBack(); setError(false) } catch { setError(true) } }}><Plus aria-hidden="true" />{translate(locale, 'editor.noteMemory.addMnemonic')}</Button>}
    </div>
    {conflict && <div role="alert" className="flex flex-wrap items-center gap-2 px-4 pb-3 text-sm"><p>{translate(locale, 'editor.noteMemory.externalConflict')}</p>{draft && <Button size="sm" variant="outline" onClick={() => { void writeClipboardText(draft()).catch(() => setError(true)) }}><Copy aria-hidden="true" />{translate(locale, 'learning.noteMemory.copy')}</Button>}</div>}
    {error && <p role="alert" className="px-4 pb-3 text-sm text-destructive">{translate(locale, 'learning.error')}</p>}
  </div>
}
