import { Button } from '../ui/button'
import { memo } from 'react'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import type { InboxPeriod } from '../../types'

interface InboxFilterPillsProps {
  active: InboxPeriod
  counts: Record<InboxPeriod, number>
  onChange: (period: InboxPeriod) => void
  position?: 'top' | 'bottom'
  locale?: AppLocale
}

const PILLS: { value: InboxPeriod; labelKey: TranslationKey }[] = [
  { value: 'week', labelKey: 'noteList.filter.week' },
  { value: 'month', labelKey: 'noteList.filter.month' },
  { value: 'all', labelKey: 'noteList.filter.all' },
]

const BOTTOM_GRADIENT = 'linear-gradient(to bottom, transparent 0%, var(--card) 30%, var(--card) 100%)'

function InboxFilterPillsInner({ active, counts, onChange, position = 'top', locale = 'en' }: InboxFilterPillsProps) {
  const isBottom = position === 'bottom'
  return (
    <div
      className={isBottom
        ? 'absolute bottom-0 left-0 right-0 z-10 flex flex-wrap items-center justify-center gap-2 px-4 py-3'
        : 'flex h-auto min-h-(--control-lg) shrink-0 flex-wrap items-center gap-1 border-b border-border px-4 py-1.5'}
      style={isBottom ? { background: BOTTOM_GRADIENT } : undefined}
      data-testid="inbox-filter-pills"
    >
      {PILLS.map(({ value, labelKey }) => (
        <Button variant="ghost" size="sm"
          key={value}
          type="button"
          role="tab"
          aria-selected={active === value}
          className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-md border px-3 py-0 text-small font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            active === value
              ? 'border-foreground/20 bg-foreground/10 text-foreground'
              : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          onClick={() => onChange(value)}
          data-testid={`inbox-pill-${value}`}
        >
          {translate(locale, labelKey)}
          <span className={`text-caption tabular-nums ${active === value ? 'text-foreground' : 'text-muted-foreground'}`}>
            {Reflect.get(counts, value)}
          </span>
        </Button>
      ))}
    </div>
  )
}

export const InboxFilterPills = memo(InboxFilterPillsInner)
