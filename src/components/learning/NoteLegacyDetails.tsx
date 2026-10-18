import { Copy } from '@phosphor-icons/react'
import { useState } from 'react'
import { CardEditorSection } from './CardEditorSection'
import { Button } from '../ui/button'
import { writeClipboardText } from '../../utils/clipboardText'
import { translate, type AppLocale } from '../../lib/i18n'
import type { NoteConversionCandidate } from '../../lib/learning/noteConversionTypes'
export function NoteLegacyDetails({ candidates,locale }: { candidates: NoteConversionCandidate[]; locale: AppLocale }) {
  const [error,setError] = useState(false)
  return <CardEditorSection title={translate(locale,'learning.noteMemory.legacyData')} count={candidates.length}>
    <div className="space-y-4">{candidates.map((candidate,index) => <article key={candidate.card.id} className="min-w-0 space-y-2"><div className="flex items-start justify-between gap-2"><p className="break-words font-medium">{translate(locale,'learning.noteMemory.oldCard',{ n: index + 1 })} · {candidate.card.front}</p><Button variant="ghost" size="sm" onClick={() => { void writeClipboardText(candidate.propertiesRaw).catch(() => setError(true)) }}><Copy aria-hidden="true" />{translate(locale,'learning.noteMemory.copyProperties')}</Button></div><pre className="note-memory-raw">{candidate.propertiesRaw}</pre>{Object.keys(candidate.card.propertyDefinitions ?? {}).length > 0 && <pre className="note-memory-raw">{JSON.stringify(candidate.card.propertyDefinitions,null,2)}</pre>}</article>)}{error && <p role="alert">{translate(locale,'learning.error')}</p>}</div>
  </CardEditorSection>
}
