import { Copy, Plus } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from './ui/button'
import { TabsList, TabsTrigger } from './ui/tabs'
import { translate, type AppLocale } from '../lib/i18n'
import { writeClipboardText } from '../utils/clipboardText'

interface NoteMemoryEditorTabsProps {
  hasBack: boolean
  showFaces: boolean
  showStudy: boolean
  showAddBack?: boolean
  panelId: string
  locale: AppLocale
  onAddBack: () => void | Promise<void>
  conflict?: boolean
  draft?: () => string
}

/** One navigation row for the note, its cue and the learning panel. */
export function NoteMemoryEditorTabs({ hasBack, showFaces, showStudy, showAddBack = true, panelId, locale, onAddBack, conflict, draft }: NoteMemoryEditorTabsProps) {
  const [error, setError] = useState(false)
  const add = async () => {
    try { await onAddBack(); setError(false) }
    catch { setError(true) }
  }
  return <div className="note-memory-nav border-b border-border">
    <div className="note-memory-editor-navigation flex min-w-0 items-center gap-2 px-3">
      <TabsList variant="line" className="note-memory-editor-tabs" aria-label={translate(locale, 'learning.content')}>
        <TabsTrigger id={`${panelId}-front`} aria-controls={panelId} value="front">{translate(locale, 'editor.noteMemory.noteTab')}</TabsTrigger>
        {showFaces && hasBack && <TabsTrigger id={`${panelId}-back`} aria-controls={panelId} value="back">{translate(locale, 'editor.noteMemory.mnemonicTab')}</TabsTrigger>}
        {showStudy && <TabsTrigger value="cards">{translate(locale, 'editor.noteMemory.studyTab')}</TabsTrigger>}
      </TabsList>
      {showFaces && showAddBack && !hasBack && <Button size="sm" variant="ghost" className="shrink-0" onClick={() => { void add() }}><Plus aria-hidden="true" />{translate(locale, 'editor.noteMemory.addMnemonic')}</Button>}
    </div>
    {conflict && <div role="alert" className="flex flex-wrap items-center gap-2 px-4 pb-3 text-sm"><p>{translate(locale, 'editor.noteMemory.externalConflict')}</p>{draft && <Button size="sm" variant="outline" onClick={() => { void writeClipboardText(draft()).catch(() => setError(true)) }}><Copy aria-hidden="true" />{translate(locale, 'learning.noteMemory.copy')}</Button>}</div>}
    {error && <p role="alert" className="px-4 pb-3 text-sm text-destructive">{translate(locale, 'learning.error')}</p>}
  </div>
}
