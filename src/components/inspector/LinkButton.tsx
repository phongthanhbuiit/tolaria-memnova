import { translate } from '../../lib/i18n'
import { useAppLocale } from '../../hooks/useAppPreferences'
import { Button } from '@/components/ui/button'
import type { ComponentType, SVGAttributes } from 'react'
import { X } from '@phosphor-icons/react'
import { NoteTitleIcon } from '../NoteTitleIcon'

export function StatusSuffix({ isArchived }: { isArchived: boolean }) {
  if (isArchived) return <span className="ml-1 text-caption text-text-secondary">(archived)</span>
  return null
}

export function LinkButton({ label, noteIcon, typeColor, bgColor, isArchived, onClick, onRemove, title, TypeIcon }: {
  label: string
  noteIcon?: string | null
  typeColor: string
  bgColor?: string
  isArchived: boolean
  onClick: () => void
  onRemove?: () => void
  title?: string
  TypeIcon: ComponentType<SVGAttributes<SVGSVGElement>>
}) {
  const locale = useAppLocale()
  const isDimmed = isArchived
  const color = isDimmed ? 'var(--muted-foreground)' : typeColor
  return (
    <span
      className={`group/link rounded-sm text-body font-medium flex w-full min-w-0 items-center justify-between gap-2${bgColor ? ' px-2 ring-inset hover:ring-1 hover:ring-current' : ' hover:opacity-80'}`}
      style={{
        background: isDimmed ? 'var(--muted)' : (bgColor ?? 'transparent'),
        color,
      }}
    >
      <Button variant="ghost" size="sm"
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-[6px] justify-start truncate border-0 bg-transparent p-0 text-left text-body"
        onClick={onClick}
        title={title}
      >
        <NoteTitleIcon icon={noteIcon} size={16} />
        {label}
        <StatusSuffix isArchived={isArchived} />
      </Button>
      <span className="flex items-center gap-1.5 shrink-0">
        {onRemove && (
          <Button variant="ghost" size="icon-sm"
            type="button"
            className="flex items-center border-0 bg-transparent p-0 text-body opacity-0 transition-opacity group-hover/link:opacity-100 focus-visible:opacity-100"
            onClick={onRemove}
            title={translate(locale, 'a11y.removeRelation')}
            aria-label={translate(locale, 'a11y.removeRelation')}
            data-testid="remove-relation-ref"
          >
            <X size={16} />
          </Button>
        )}
        <TypeIcon width={16} height={16} className="shrink-0" style={{ color, opacity: 0.5 }} />
      </span>
    </span>
  )
}
