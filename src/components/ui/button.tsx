import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { controlLayouts } from './control-layout'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[6px] whitespace-nowrap rounded-md text-body font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[16px] shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        toolbar: "bg-transparent hover:bg-transparent",
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        toolbar: "h-auto w-auto min-h-(--control-sm) min-w-0 rounded-none p-0",
        "study-grade": "min-h-[56px] px-[8px] py-[8px] min-[520px]:max-[640px]:px-[4px]",
        "study-reveal": "min-h-[40px] px-4 py-0 has-[>svg]:px-3",
        // Keep legacy names/data-size values while callers migrate screen by screen.
        default: "min-h-(--control-md) px-4 py-0 has-[>svg]:px-3",
        md: "min-h-(--control-md) px-4 py-0 has-[>svg]:px-3",
        xs: "min-h-(--control-sm) px-2 py-0 has-[>svg]:px-1.5",
        sm: "min-h-(--control-sm) px-3 py-0 has-[>svg]:px-2.5",
        lg: "min-h-(--control-lg) px-6 py-0 has-[>svg]:px-4",
        icon: "min-h-(--control-md) min-w-(--control-md) p-0",
        "icon-md": "min-h-(--control-md) min-w-(--control-md) p-0",
        "icon-xs": "min-h-(--control-sm) min-w-(--control-sm) p-0",
        "icon-sm": "min-h-(--control-sm) min-w-(--control-sm) p-0",
        "icon-lg": "min-h-(--control-lg) min-w-(--control-lg) p-0",
      },
      layout: controlLayouts,
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  layout = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, layout, className }))}
      {...props}
    />
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- shadcn/ui pattern
export { Button, buttonVariants }
