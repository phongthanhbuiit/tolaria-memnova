import type { VaultEntry } from '../../types'
import { Info } from '@phosphor-icons/react'
import { countWords } from '../../utils/wikilinks'
import { translate, type AppLocale } from '../../lib/i18n'
import {
  formatTimestampForDateDisplay,
  type DateDisplayFormat,
} from '../../utils/dateDisplay'
import { useDateDisplayFormat } from '../../hooks/useAppPreferences'

function formatDate(timestamp: number | null, dateDisplayFormat: DateDisplayFormat, locale: AppLocale): string {
  if (!timestamp) return '\u2014'
  return formatTimestampForDateDisplay(timestamp, dateDisplayFormat, locale)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-2 items-center gap-2 px-2" data-testid="readonly-property">
      <span className="min-w-0 whitespace-normal break-words text-small text-text-secondary">{label}</span>
      <span className="min-w-0 whitespace-normal break-words text-right text-small" >{value}</span>
    </div>
  )
}

export function NoteInfoPanel({
  entry,
  content,
  locale = 'en',
}: {
  entry: VaultEntry
  content: string | null
  locale?: AppLocale
}) {
  const dateDisplayFormat = useDateDisplayFormat()
  const wordCount = countWords(content ?? '')
  return (
    <div>
      <h4 className="text-caption font-medium tracking-wide mb-2 flex items-center gap-1 text-text-secondary">
        <Info size={16} className="shrink-0" />
        {translate(locale, 'inspector.info.title')}
      </h4>
      <div className="flex flex-col gap-2">
        <InfoRow label={translate(locale, 'inspector.info.modified')} value={formatDate(entry.modifiedAt, dateDisplayFormat, locale)} />
        <InfoRow label={translate(locale, 'inspector.info.created')} value={formatDate(entry.createdAt, dateDisplayFormat, locale)} />
        <InfoRow label={translate(locale, 'inspector.info.words')} value={String(wordCount)} />
        <InfoRow label={translate(locale, 'inspector.info.size')} value={formatFileSize(entry.fileSize)} />
      </div>
    </div>
  )
}
