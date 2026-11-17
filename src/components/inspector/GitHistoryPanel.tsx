import { Button } from '@/components/ui/button'
import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { useAppLocale } from '../../hooks/useAppPreferences'
import { getLocaleDateLocale, translate, type AppLocale } from '../../lib/i18n'
import type { GitCommit } from '../../types'

function formatRelativeDate(timestamp: number, locale: AppLocale): string {
  const now = Math.floor(Date.now() / 1000)
  const days = Math.floor((now - timestamp) / 86400)
  const formatter = new Intl.RelativeTimeFormat(getLocaleDateLocale(locale), { numeric: 'auto' })
  if (days < 1) return formatter.format(0, 'day')
  if (days < 30) return formatter.format(-days, 'day')
  return formatter.format(-Math.floor(days / 30), 'month')
}

export function GitHistoryPanel({ commits, onViewCommitDiff }: { commits: GitCommit[]; onViewCommitDiff?: (commitHash: string) => void }) {
  const locale = useAppLocale()
  if (commits.length === 0) return null

  return (
    <div>
      <h4 className="text-caption font-medium tracking-wide mb-2 flex items-center gap-1 text-text-secondary">
        <ArrowCounterClockwise size={12} className="shrink-0" />
        {translate(locale, 'inspector.history.title')}
      </h4>
      <div className="flex flex-col gap-2.5">
        {commits.map((c) => (
          <div key={c.hash} style={{ borderLeft: '2px solid var(--border)', paddingLeft: 10 }}>
            <Button variant="ghost" size="sm" type="button"
              className="mb-0.5 w-full justify-start cursor-pointer truncate border-none bg-transparent p-0 text-left text-body text-primary hover:underline"
              onClick={() => onViewCommitDiff?.(c.hash)}
              title={translate(locale, 'inspector.history.viewDiff', { hash: c.shortHash })}
            >
              <span className="font-mono text-caption">{c.shortHash}</span>
              {' · '}
              {c.message}
            </Button>
            <div className="text-small text-text-secondary">
              {formatRelativeDate(c.date, locale)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
