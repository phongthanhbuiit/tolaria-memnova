import type { ComponentProps } from 'react'
import { Label as LabelPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

export function Label({
  className,
  id,
  htmlFor,
  children,
}: Pick<ComponentProps<typeof LabelPrimitive.Root>, 'className' | 'id' | 'htmlFor' | 'children'>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      id={id}
      htmlFor={htmlFor}
      className={cn(
        'flex items-center gap-2 text-sm font-medium leading-none select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className
      )}
    >{children}</LabelPrimitive.Root>
  )
}
