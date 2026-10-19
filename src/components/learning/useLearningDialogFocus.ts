import { useCallback, useLayoutEffect, useRef, type MouseEvent } from 'react'

/** macOS WebKit does not focus pointer-activated buttons before a controlled dialog opens. */
export function focusLearningDialogTrigger(event: MouseEvent<HTMLButtonElement>) {
  event.currentTarget.focus({ preventScroll: true })
}

/** Controlled learning dialogs have no Radix Trigger; retain their real invoking control. */
export function useLearningDialogFocus() {
  const previous = useRef<HTMLElement | null>(null)
  const onOpenAutoFocus = useCallback(() => {
    previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }, [])
  const onCloseAutoFocus = useCallback((event: Event) => {
    if (previous.current?.isConnected) {
      event.preventDefault()
      previous.current.focus({ preventScroll: true })
    }
  }, [])
  return { onOpenAutoFocus, onCloseAutoFocus }
}

/** Radix's external Escape listener must read the current guard, including after async loading. */
export function useLearningDialogDismiss(busy: boolean, onChange: (open: boolean) => void) {
  const current = useRef({ busy, onChange })
  useLayoutEffect(() => { current.current = { busy, onChange } }, [busy, onChange])
  const onOpenChange = useCallback((open: boolean) => {
    if (!current.current.busy) current.current.onChange(open)
  }, [])
  const onEscapeKeyDown = useCallback((event: KeyboardEvent) => {
    event.preventDefault()
    onOpenChange(false)
  }, [onOpenChange])
  return { onOpenChange, onEscapeKeyDown }
}
