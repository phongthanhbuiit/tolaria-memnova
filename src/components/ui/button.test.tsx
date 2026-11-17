import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

describe('Button sizes', () => {
  it.each([
    ['icon', '--control-md'], ['icon-md', '--control-md'],
    ['icon-xs', '--control-sm'], ['icon-sm', '--control-sm'],
    ['icon-lg', '--control-lg'],
  ] as const)('%s has square token dimensions without imposing that token on compact callers', (size, token) => {
    render(<Button size={size} aria-label="Action" />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass(`h-(${token})`, `w-(${token})`)
    expect(button).not.toHaveClass(`min-h-(${token})`, `min-w-(${token})`)
  })

  it('provides an explicit inline target using the spacing scale', () => {
    render(<Button size="icon-inline" aria-label="Remove link" />)
    expect(screen.getByRole('button')).toHaveClass('size-7', 'min-h-7', 'min-w-7', 'p-0')
  })

  it('allows legacy compact dimensions while retaining a 24px minimum target floor', () => {
    render(<Button size="icon-xs" className="h-6 w-6" aria-label="Close" />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-6', 'w-6', 'min-h-7', 'min-w-7')
    expect(button).not.toHaveClass('min-h-(--control-sm)', 'min-w-(--control-sm)')
  })

  it.each([
    ['default', '--control-md'], ['md', '--control-md'],
    ['xs', '--control-sm'], ['sm', '--control-sm'], ['lg', '--control-lg'],
    ['toolbar', '--control-sm'],
  ] as const)('%s text controls keep content-growing minimum heights', (size, token) => {
    render(<Button size={size}>Action</Button>)
    expect(screen.getByRole('button')).toHaveClass(`min-h-(${token})`)
  })

  it.each([['study-grade', 'min-h-[56px]'], ['study-reveal', 'min-h-[40px]']] as const)(
    '%s preserves the study target', (size, height) => {
      render(<Button size={size}>Study</Button>)
      expect(screen.getByRole('button')).toHaveClass(height)
    },
  )

  it('preserves the responsive coarse-pointer target on inline buttons', () => {
    render(<Button size="icon-inline" layout="responsive" aria-label="Remove" />)
    expect(screen.getByRole('button')).toHaveClass('[@media(pointer:coarse)]:min-h-[44px]', '[@media(pointer:coarse)]:min-w-[44px]')
  })
})
