import { TrashSimple } from '@phosphor-icons/react'

export function EmptyMessage({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-body text-muted-foreground">{text}</div>
}

export function DeletedNotesBanner({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] opacity-60" style={{ padding: 'calc(var(--spacing) * 4)' }} data-testid="deleted-notes-banner">
      <TrashSimple size={14} className="shrink-0 text-muted-foreground" />
      <span className="text-body text-muted-foreground">{count} {count === 1 ? 'note' : 'notes'} deleted</span>
    </div>
  )
}
