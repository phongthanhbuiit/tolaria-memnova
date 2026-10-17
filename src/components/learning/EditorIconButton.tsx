import type { ComponentProps } from 'react'
import { Button } from '../ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { cardEditorStyles } from './cardEditorStyles'
type Props = Omit<ComponentProps<typeof Button>, 'aria-label'> & {
  label: string
}
export function EditorIconButton({ label, children, ...props }: Props) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            {...props}
            data-slot="button"
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent className={cardEditorStyles.portal}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
