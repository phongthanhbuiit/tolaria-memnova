import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { PropertyEditor } from './PropertyEditor'
import type {
  PropertyValues,
  PropertyDefinitions,
} from '../../lib/learning/propertyValues'
vi.mock('./SourcePagePicker', () => ({ SourcePagePicker: () => null }))
const initial = {
  zero: 0,
  flag: false,
  empty: '',
  list: [],
  nil: null,
  opaque: { nested: [false, 1] },
}
function Harness() {
  const [draft, setDraft] = useState<{
    values: PropertyValues
    definitions: PropertyDefinitions
  }>({ values: structuredClone(initial), definitions: {} })
  return (
    <>
      <PropertyEditor
        values={draft.values}
        definitions={draft.definitions}
        locale="en"
        onChange={setDraft}
      />
      <output data-testid="draft">{JSON.stringify(draft)}</output>
    </>
  )
}
it('edits falsy values, renames and removes only explicitly while preserving opaque data', () => {
  render(<Harness />)
  expect(screen.getByRole('textbox', { name: 'zero', exact: true })).toHaveValue('0')
  expect(screen.getByRole('switch', { name: 'flag' })).not.toBeChecked()
  fireEvent.click(screen.getByRole('switch', { name: 'flag' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'zero', exact: true }), { target: { value: '' } })
  expect(screen.getByRole('textbox', { name: 'zero', exact: true })).toHaveAttribute('aria-invalid', 'true')
  fireEvent.change(screen.getByRole('textbox', { name: 'zero', exact: true }), { target: { value: '12' } })
  fireEvent.change(screen.getByLabelText('Property name empty'), {
    target: { value: 'renamed' },
  })
  const row = screen.getByLabelText('Property name empty').parentElement!
    .parentElement!
  fireEvent.click(within(row).getByRole('button', { name: 'Rename' }))
  fireEvent.click(
    screen.getByRole('button', { name: 'Remove renamed', exact: true }),
  )
  const draft = JSON.parse(screen.getByTestId('draft').textContent!)
  expect(draft.values).toEqual({
    zero: 12,
    flag: true,
    list: [],
    nil: null,
    opaque: initial.opaque,
  })
  expect(draft.definitions.zero).toEqual({ valueKind: 'number' })
  expect(
    screen
      .getAllByText(/"nested"/)
      .some((element) => element.tagName === 'PRE'),
  ).toBe(true)
})
it('rejects duplicate and reserved names and previews a safe type conversion', () => {
  render(<Harness />)
  const name = screen.getByRole('textbox', {
    name: 'Property name',
    exact: true,
  })
  fireEvent.change(name, { target: { value: '_fsrs' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add property' }))
  expect(screen.getByRole('alert')).toBeVisible()
  fireEvent.change(name, { target: { value: 'zero' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add property' }))
  expect(screen.getByRole('alert')).toHaveTextContent('already exists')
  fireEvent.click(screen.getByRole('combobox', { name: 'Property type zero' }))
  fireEvent.click(screen.getByRole('option', { name: 'Text', exact: true }))
  expect(JSON.parse(screen.getByTestId('draft').textContent!).values.zero).toBe(
    0,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Apply type', exact: true }))
  expect(JSON.parse(screen.getByTestId('draft').textContent!).values.zero).toBe(
    '0',
  )
})

it('rejects lossy conversions and keeps mismatched legacy definitions read-only', () => {
  const change = vi.fn()
  const { rerender } = render(<Harness />)
  fireEvent.click(screen.getByRole('combobox', { name: 'Property type empty' }))
  fireEvent.click(screen.getByRole('option', { name: 'Number', exact: true }))
  expect(screen.getByRole('alert')).toHaveTextContent('lose information')
  expect(
    JSON.parse(screen.getByTestId('draft').textContent!).values.empty,
  ).toBe('')
  rerender(
    <PropertyEditor
      values={{ deadline: 'not a date' }}
      definitions={{ deadline: { valueKind: 'date' } }}
      locale="en"
      onChange={change}
    />,
  )
  expect(screen.getByText('"not a date"')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'deadline', exact: true }),
  ).not.toBeInTheDocument()
  expect(change).not.toHaveBeenCalled()
})

it('does not rename opaque or unsafe numeric projections through JavaScript', () => {
  render(
    <PropertyEditor
      values={{ large: 9007199254740992, opaque: { large: 9007199254740992 } }}
      definitions={{}}
      locale="en"
      onChange={vi.fn()}
    />,
  )
  expect(screen.getByLabelText('Property name large')).toBeDisabled()
  expect(screen.getByLabelText('Property name opaque')).toBeDisabled()
})
