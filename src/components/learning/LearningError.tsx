import { Copy, WarningCircle } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Button } from '../ui/button'
import { CardEditorSection } from './CardEditorSection'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import { writeClipboardText } from '../../utils/clipboardText'

function messageFor(error: string): TranslationKey {
  if (/note-recovery-required|needs-recovery/u.test(error)) return 'learning.noteMemory.needsRecovery'
  if (/missing-page|missing-source|unreadable-page|source-unavailable/u.test(error)) return 'learning.noteMemory.sourceUnavailable'
  return 'learning.error'
}

/** Keep diagnostic strings available without putting implementation details in the primary flow. */
export function LearningError({ error, locale, children }: { error: string; locale: AppLocale; children?: ReactNode }) {
  const [copyFailure, setCopyFailure] = useState<string | null>(null)
  return <div role="alert" className="note-memory-error space-y-3 rounded-lg border border-destructive p-3">
    <p className="flex items-start gap-2 text-sm"><WarningCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{translate(locale, messageFor(error))}</p>
    {children}
    <CardEditorSection title={translate(locale, 'learning.errorDetails')}>
      <pre className="note-memory-raw">{error}</pre>
      <Button variant="ghost" size="sm" onClick={() => {
        void writeClipboardText(error).then(() => setCopyFailure(null), () => setCopyFailure(error))
      }}><Copy aria-hidden="true" />{translate(locale, 'learning.noteMemory.copy')}</Button>
      {copyFailure === error && <p role="status" className="text-xs text-destructive">{translate(locale, 'learning.error')}</p>}
    </CardEditorSection>
  </div>
}
