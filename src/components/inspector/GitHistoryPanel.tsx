import { Button } from '@/components/ui/button'
import { ArrowCounterClockwise } from '@phosphor-icons/react'
import type { GitCommit } from '../../types'

function formatRelativeDate(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const days = Math.floor((now - timestamp) / 86400)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1mo ago' : `${months}mo ago`
}

export function GitHistoryPanel({ commits, onViewCommitDiff }: { commits: GitCommit[]; onViewCommitDiff?: (commitHash: string) => void }) {
  if (commits.length === 0) return null

  return (
    <div>
      <h4 className="text-caption font-medium tracking-wide mb-2 flex items-center gap-1 text-text-secondary">
        <ArrowCounterClockwise size={12} className="shrink-0" />
        History
      </h4>
      <div className="flex flex-col gap-2.5">
        {commits.map((c) => (
          <div key={c.hash} style={{ borderLeft: '2px solid var(--border)', paddingLeft: 10 }}>
            <Button variant="ghost" size="sm" type="button"
              className="mb-0.5 w-full justify-start cursor-pointer truncate border-none bg-transparent p-0 text-left text-body text-primary hover:underline"
              onClick={() => onViewCommitDiff?.(c.hash)}
              title={`View diff for ${c.shortHash}`}
            >
              <span className="font-mono text-caption">{c.shortHash}</span>
              {' · '}
              {c.message}
            </Button>
            <div className="text-small text-text-secondary">
              {formatRelativeDate(c.date)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
