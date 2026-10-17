import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { CardEditorSection } from './CardEditorSection'
import { Input } from '../ui/input'
function StatefulField() {
  const [value, setValue] = useState('12')
  return (
    <Input
      aria-label="Draft number"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  )
}
it('keeps a draft mounted while collapsed and removes hidden controls from the accessible path', () => {
  render(
    <CardEditorSection title="Properties" defaultOpen>
      <StatefulField />
    </CardEditorSection>,
  )
  fireEvent.change(screen.getByRole('textbox', { name: 'Draft number' }), {
    target: { value: '-' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
  expect(
    screen.queryByRole('textbox', { name: 'Draft number' }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('textbox', { name: 'Draft number', hidden: true }),
  ).toHaveValue('-')
  expect(screen.getByRole('button', { name: 'Properties' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
  expect(screen.getByRole('textbox', { name: 'Draft number' })).toHaveValue('-')
})
