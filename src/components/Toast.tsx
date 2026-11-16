import { useEffect } from 'react'
import { X } from '@phosphor-icons/react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

interface ToastProps {
  message: string | null
  onDismiss: () => void
  action?: { label: string; dismissLabel: string; run: () => void }
}

export function Toast({ message, onDismiss, action }: ToastProps) {
  useEffect(() => {
    if (!message || action) return
    const timer = setTimeout(onDismiss, 2000)
    return () => clearTimeout(timer)
  }, [message, onDismiss, action])

  if (!message) return null

  return (
    <div className={cn(
      "fixed bottom-8 left-1/2 -translate-x-1/2 z-[1100]",
      "bg-secondary text-foreground px-5 py-2 rounded-lg text-[13px]",
      "shadow-[0_4px_16px_var(--shadow-dialog)]",
      "animate-in slide-in-from-bottom-2 fade-in duration-200"
    )}>
      <span role="status">{message}</span>
      {action && <>
        <Button className="ml-2" type="button" variant="outline" size="sm" onClick={action.run}>{action.label}</Button>
        <Button type="button" variant="ghost" size="icon-xs" aria-label={action.dismissLabel} onClick={onDismiss}><X aria-hidden="true" /></Button>
      </>}
    </div>
  )
}
