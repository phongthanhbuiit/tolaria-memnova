import { ArrowLeft, Copy } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from './ui/button'
import { translate, type AppLocale } from '../lib/i18n'
import { writeClipboardText } from '../utils/clipboardText'

interface NoteMemoryEditorTabsProps {
  showContext?: boolean
  panelId: string
  locale: AppLocale
  onReturn: () => void | Promise<void>
  conflict?: boolean
  draft?: () => string
}

/** Context and return action while editing the optional mnemonic. */
export function NoteMemoryEditorTabs({ panelId, showContext = true, locale, onReturn, conflict, draft }: NoteMemoryEditorTabsProps) {
  const [error, setError] = useState(false)
  const goBack = async () => {
    try { await onReturn(); setError(false) }
    catch { setError(true) }
  }
  return <div className="note-memory-nav border-b border-border">
    {showContext && <div className="flex min-w-0 flex-wrap items-center gap-2 px-3 py-1">
      <Button id={`${panelId}-back`} size="sm" variant="ghost" onClick={() => { void goBack() }}>
        <ArrowLeft aria-hidden="true" />{translate(locale, 'editor.noteMemory.backToNote')}
      </Button>
      <span className="text-xs text-muted-foreground">{translate(locale, 'editor.noteMemory.mnemonicTab')}</span>
    </div>}
    {conflict && <div role="alert" className="flex flex-wrap items-center gap-2 px-4 pb-3 text-sm"><p>{translate(locale, 'editor.noteMemory.externalConflict')}</p>{draft && <Button size="sm" variant="outline" onClick={() => { void writeClipboardText(draft()).catch(() => setError(true)) }}><Copy aria-hidden="true" />{translate(locale, 'learning.noteMemory.copy')}</Button>}</div>}
    {error && <p role="alert" className="px-4 pb-3 text-sm text-destructive">{translate(locale, 'learning.error')}</p>}
  </div>
}
