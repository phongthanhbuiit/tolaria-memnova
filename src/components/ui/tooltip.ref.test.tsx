import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './button'
import { Tooltip, TooltipProvider, TooltipTrigger } from './tooltip'

function Action({ label, triggerRef }: { label: string; triggerRef: (node: HTMLSpanElement | null) => void }) {
  return <TooltipProvider><Tooltip><TooltipTrigger asChild>
    <span ref={triggerRef}><Button>{label}</Button></span>
  </TooltipTrigger></Tooltip></TooltipProvider>
}

describe('tooltip trigger stability', () => {
  it('keeps its anchor attached when note updates rerender an action', () => {
    const triggerRef = vi.fn()
    const { rerender } = render(<Action label="Go Back" triggerRef={triggerRef} />)
    const anchor = screen.getByRole('button', { name: 'Go Back' }).parentElement
    expect(triggerRef).toHaveBeenLastCalledWith(anchor)
    triggerRef.mockClear()
    rerender(<Action label="Go Back after editing" triggerRef={triggerRef} />)
    expect(screen.getByRole('button', { name: 'Go Back after editing' }).parentElement).toBe(anchor)
    expect(triggerRef).not.toHaveBeenCalled()
  })
})
