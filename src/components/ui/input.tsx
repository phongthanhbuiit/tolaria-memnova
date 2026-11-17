import * as React from "react"

import { nativeTextAssistanceDisabledProps } from "@/lib/nativeTextAssistance"
import { cn } from "@/lib/utils"
import { controlLayouts, type ControlLayout } from './control-layout'

function Input({ className, type, controlSize = "md", layout = "default", ...props }: React.ComponentProps<"input"> & {
  // The native numeric `size` attribute remains available to callers.
  controlSize?: "sm" | "md" | "lg"
  layout?: ControlLayout
}) {
  return (
    <input
      type={type}
      data-slot="input"
      {...nativeTextAssistanceDisabledProps}
      className={cn(
        "file:text-foreground placeholder:text-text-muted selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-0 text-body transition-[color,box-shadow] outline-none file:inline-flex file:border-0 file:bg-transparent file:text-body file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        controlSize === "sm" ? "min-h-(--control-sm)" : controlSize === "lg" ? "min-h-(--control-lg)" : "min-h-(--control-md)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        controlLayouts[layout], className
      )}
      {...props}
    />
  )
}

export { Input }
