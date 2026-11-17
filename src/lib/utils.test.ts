import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('chrome typography class merging', () => {
  it.each(['caption', 'small', 'body', 'body-lg', 'title', 'display', 'study'])(
    'preserves text-%s alongside a text color and allows caller font-size overrides',
    (level) => {
      expect(cn(`text-${level}`, 'text-primary-foreground')).toBe(`text-${level} text-primary-foreground`)
      expect(cn(`text-${level}`, 'text-sm')).toBe('text-sm')
      expect(cn('text-sm', `text-${level}`)).toBe(`text-${level}`)
    },
  )
})
