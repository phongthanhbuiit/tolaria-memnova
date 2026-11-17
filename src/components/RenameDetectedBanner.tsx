import { Button } from '@/components/ui/button'
import { ArrowsClockwise } from '@phosphor-icons/react'

export interface DetectedRename {
  old_path: string
  new_path: string
}

interface RenameDetectedBannerProps {
  renames: DetectedRename[]
  onUpdate: () => void
  onDismiss: () => void
}

export function RenameDetectedBanner({ renames, onUpdate, onDismiss }: RenameDetectedBannerProps) {
  if (renames.length === 0) return null

  const count = renames.length
  return (
    <div className="flex items-center gap-3 border-b border-border bg-accent/50 px-4 py-2 text-(length:--text-body) leading-(--text-body--line-height)">
      <ArrowsClockwise size={16} className="shrink-0 text-accent-foreground" />
      <span className="flex-1 text-foreground">
        {count} file{count !== 1 ? 's' : ''} renamed outside Tolaria. Update wikilinks?
      </span>
      <Button variant="bare" type="button"
        className="shrink-0 cursor-pointer rounded-md bg-primary px-3 py-1 text-(length:--text-small) leading-(--text-small--line-height) font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        onClick={onUpdate}
      >
        Update wikilinks
      </Button>
      <Button variant="bare" type="button"
        className="shrink-0 cursor-pointer rounded-md border border-border bg-transparent px-3 py-1 text-(length:--text-small) leading-(--text-small--line-height) font-medium text-muted-foreground transition-colors hover:bg-muted"
        onClick={onDismiss}
      >
        Ignore
      </Button>
    </div>
  )
}
