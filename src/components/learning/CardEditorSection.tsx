import { useId, useState, type ReactNode } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { cardEditorStyles } from './cardEditorStyles'

type Props = {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  action?: ReactNode
  count?: number
  disabled?: boolean
}
export function CardEditorSection({
  title,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  action,
  count,
  disabled = false,
}: Props) {
  const id = useId()
  const [expanded, setExpanded] = useState(defaultOpen)
  const visible = open ?? expanded
  return (
    <section className="min-w-0 rounded-lg border">
      <div className="flex min-w-0 items-center gap-2 px-2">
        <h3 className="min-w-0 flex-1">
          <Button
            variant="ghost"
            disabled={disabled}
            className="w-full justify-start whitespace-normal text-left"
            aria-label={`${title}${count !== undefined ? ` (${count})` : ''}`}
            aria-expanded={visible}
            aria-controls={id}
            onClick={() => {
              setExpanded(!visible)
              onOpenChange?.(!visible)
            }}
          >
            <CaretDown
              className={`${cardEditorStyles.icon} ${visible ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
            <span className="min-w-0 break-words">{title}</span>
            {count !== undefined && (
              <span className="text-muted-foreground">({count})</span>
            )}
          </Button>
        </h3>
        {action}
      </div>
      <div id={id} hidden={!visible} className="min-w-0 border-t p-3">
        {children}
      </div>
    </section>
  )
}
