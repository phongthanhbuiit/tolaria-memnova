import { useEffect, useRef } from 'react'
import type { PropertyValues } from '../../lib/learning/propertyValues'
type Target = { kind: 'add' } | { kind: 'menu'; key: string }
// Explicit actions may unmount their own focused control. Restore a stable
// target after the caller commits the draft, never on ordinary value typing.
export function usePropertyEditorFocus(
  values: PropertyValues,
  adding: boolean,
  expanded: boolean,
) {
  const root = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    addButton = useRef<HTMLButtonElement>(null),
    pending = useRef<Target | null>(null)
  useEffect(() => {
    if (adding && expanded) input.current?.focus()
  }, [adding, expanded])
  useEffect(() => {
    const target = pending.current
    if (!target) return
    pending.current = null
    if (target.kind === 'add') {
      ;(adding ? input.current : addButton.current)?.focus()
      return
    }
    const buttons =
      root.current?.querySelectorAll<HTMLButtonElement>('[data-field-menu]')
    Array.from(buttons ?? [])
      .find((button) => button.getAttribute('data-field-menu') === target.key)
      ?.focus()
  }, [values, adding])
  return {
    root,
    input,
    addButton,
    requestFocus: (target: Target) => {
      pending.current = target
    },
  }
}
