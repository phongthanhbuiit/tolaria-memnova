import { ArrowLeft, Copy } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Button } from './ui/button'
import { translate, type AppLocale } from '../lib/i18n'
import { writeClipboardText } from '../utils/clipboardText'

interface NoteMemoryEditorTabsProps {
  showContext?: boolean
  children?: ReactNode
  panelId: string
  locale: AppLocale
  onReturn: () => void | Promise<void>
  conflict?: boolean
  draft?: () => string
}

/** Context and return action while editing the optional mnemonic. */
export function NoteMemoryEditorTabs({ panelId, showContext = true, locale, onReturn, conflict, draft, children }: NoteMemoryEditorTabsProps) {
  const [error, setError] = useState(false)
  const goBack = async () => {
    try { await onReturn(); setError(false) }
    catch { setError(true) }
  }
  return <div className="note-memory-nav border-b border-border">
    {showContext && <div className="flex min-w-0 flex-wrap items-center gap-2 px-4 py-2">
      <Button layout="responsive" id={`${panelId}-back`} size="sm" variant="ghost" onClick={() => { void goBack() }}>
        <ArrowLeft aria-hidden="true" />{translate(locale, 'editor.noteMemory.backToNote')}
      </Button>
      <div className="min-w-0 flex-1">{children || <span className="text-small text-text-secondary">{translate(locale, 'editor.noteMemory.mnemonicTab')}</span>}</div>
    </div>}
    {conflict && <div role="alert" className="flex flex-wrap items-center gap-2 px-4 pb-3 text-body"><p>{translate(locale, 'editor.noteMemory.externalConflict')}</p>{draft && <Button layout="responsive" size="sm" variant="outline" onClick={() => { void writeClipboardText(draft()).catch(() => setError(true)) }}><Copy aria-hidden="true" />{translate(locale, 'learning.noteMemory.copy')}</Button>}</div>}
    {error && <p role="alert" className="px-4 pb-3 text-body text-destructive">{translate(locale, 'learning.error')}</p>}
  </div>
}
