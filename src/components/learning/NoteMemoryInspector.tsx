import { ArrowClockwise, CalendarBlank } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { useNoteMemoryInspector } from './useNoteMemoryInspector'
import { NoteLegacyDetails } from './NoteLegacyDetails'
import { translate, type AppLocale } from '../../lib/i18n'

function dueLabel(due: string, locale: AppLocale): string {
  const date = new Date(due)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
    : '—'
}
/** One note owns editable properties; schedule and conversion snapshots are readonly. */
export function NoteMemoryInspector({
  path,
  content,
  locale,
}: {
  path: string
  content: string | null
  locale: AppLocale
}) {
  const { visible, current, retry } = useNoteMemoryInspector(path, content)
  if (!visible) return null
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  const data = current && 'view' in current ? current : null
  return (
    <section
      aria-label={t('properties.memory')}
      className="note-memory-surface min-w-0 space-y-3 border-t px-3 py-3 text-sm"
    >
      <h3 className="flex items-start gap-2 font-medium">
        <CalendarBlank aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {t('properties.memory')}
      </h3>
      {!current && (
        <p role="status" className="text-muted-foreground">
          {t('learning.loading')}
        </p>
      )}
      {current && 'error' in current && (
        <div className="space-y-2">
          <p role="alert" className="text-destructive">
            {t('learning.error')}
          </p>
          <Button variant="outline" size="sm" onClick={retry}>
            <ArrowClockwise aria-hidden="true" />
            {t('learning.retry')}
          </Button>
        </div>
      )}
      {data?.view.schedule && (
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 text-xs">
          <dt className="text-muted-foreground">{t('properties.due')}</dt>
          <dd className="max-w-40 break-words text-right">
            {dueLabel(data.view.schedule.due, locale)}
          </dd>
          <dt className="text-muted-foreground">{t('properties.reps')}</dt>
          <dd className="text-right tabular-nums">{new Intl.NumberFormat(locale).format(data.view.schedule.reps)}</dd>
          <dt className="text-muted-foreground">{t('properties.lapses')}</dt>
          <dd className="text-right tabular-nums">
            {new Intl.NumberFormat(locale).format(data.view.schedule.lapses)}
          </dd>
        </dl>
      )}
      {data && !data.view.schedule && (
        <p className="text-xs text-muted-foreground">
          {t('properties.noNoteMemory')}
        </p>
      )}
      {!!data?.compatibility?.legacyCards.length && (
        <NoteLegacyDetails
          candidates={data.compatibility.legacyCards}
          locale={locale}
        />
      )}
    </section>
  )
}
