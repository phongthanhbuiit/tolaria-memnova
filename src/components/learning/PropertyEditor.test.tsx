import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
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
async function manage(name: string, action: string) {
  fireEvent.keyDown(
    screen.getByRole('button', { name: `Manage field ${name}`, exact: true }),
    { key: 'ArrowDown' },
  )
  fireEvent.click(
    await screen.findByRole('menuitem', { name: action, exact: true }),
  )
}
it('edits falsy values, renames and removes only explicitly while preserving opaque data', async () => {
  render(<Harness />)
  expect(
    screen.getByRole('textbox', { name: 'zero', exact: true }),
  ).toHaveValue('0')
  expect(screen.getByRole('switch', { name: 'flag' })).not.toBeChecked()
  fireEvent.click(screen.getByRole('switch', { name: 'flag' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'zero', exact: true }), {
    target: { value: '' },
  })
  expect(
    screen.getByRole('textbox', { name: 'zero', exact: true }),
  ).toHaveAttribute('aria-invalid', 'true')
  fireEvent.change(screen.getByRole('textbox', { name: 'zero', exact: true }), {
    target: { value: '12' },
  })
  await manage('empty', 'Rename')
  fireEvent.change(screen.getByLabelText('Property name empty'), {
    target: { value: 'renamed' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Apply name', exact: true }),
  )
  await manage('renamed', 'Remove')
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
it('rejects duplicate and reserved names and previews a safe type conversion', async () => {
  render(<Harness />)
  fireEvent.click(
    screen.getByRole('button', { name: 'Add property', exact: true }),
  )
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
  await manage('zero', 'Change type')
  fireEvent.click(screen.getByRole('combobox', { name: 'Property type zero' }))
  fireEvent.click(screen.getByRole('option', { name: 'Text', exact: true }))
  expect(JSON.parse(screen.getByTestId('draft').textContent!).values.zero).toBe(
    0,
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Apply type', exact: true }),
  )
  expect(JSON.parse(screen.getByTestId('draft').textContent!).values.zero).toBe(
    '0',
  )
})

it('rejects lossy conversions and keeps mismatched legacy definitions read-only', async () => {
  const change = vi.fn()
  const { rerender } = render(<Harness />)
  await manage('empty', 'Change type')
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

it('does not rename opaque or unsafe numeric projections through JavaScript', async () => {
  render(
    <PropertyEditor
      values={{ large: 9007199254740992, opaque: { large: 9007199254740992 } }}
      definitions={{}}
      locale="en"
      onChange={vi.fn()}
    />,
  )
  for (const name of ['large', 'opaque']) {
    fireEvent.keyDown(
      screen.getByRole('button', { name: `Manage field ${name}`, exact: true }),
      { key: 'ArrowDown' },
    )
    expect(
      await screen.findByRole('menuitem', { name: 'Rename', exact: true }),
    ).toHaveAttribute('data-disabled')
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
  }
})

it('keeps intermediate numbers, rename text and unapplied type previews across section collapse', async () => {
  render(<Harness />)
  fireEvent.change(screen.getByRole('textbox', { name: 'zero', exact: true }), {
    target: { value: '-' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Properties (6)' }))
  expect(
    screen.queryByRole('textbox', { name: 'zero', exact: true }),
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Properties (6)' }))
  expect(
    screen.getByRole('textbox', { name: 'zero', exact: true }),
  ).toHaveValue('-')
  fireEvent.change(screen.getByRole('textbox', { name: 'zero', exact: true }), {
    target: { value: '12' },
  })
  await manage('empty', 'Rename')
  fireEvent.change(screen.getByLabelText('Property name empty'), {
    target: { value: 'pending name' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Properties (6)' }))
  fireEvent.click(screen.getByRole('button', { name: 'Properties (6)' }))
  expect(screen.getByLabelText('Property name empty')).toHaveValue(
    'pending name',
  )
  await manage('zero', 'Change type')
  fireEvent.click(screen.getByRole('combobox', { name: 'Property type zero' }))
  fireEvent.click(screen.getByRole('option', { name: 'Text', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Properties (6)' }))
  fireEvent.click(screen.getByRole('button', { name: 'Properties (6)' }))
  expect(
    screen.getByRole('button', { name: 'Apply type', exact: true }),
  ).toBeVisible()
  expect(JSON.parse(screen.getByTestId('draft').textContent!).values.zero).toBe(
    12,
  )
})

async function chooseType(name: string, kind: string) {
  fireEvent.click(
    screen.getByRole('combobox', { name: `Property type ${name}` }),
  )
  fireEvent.click(screen.getByRole('option', { name: kind, exact: true }))
}

it('converts the latest value rather than a stale preview snapshot', async () => {
  render(<Harness />)
  await manage('zero', 'Change type')
  await chooseType('zero', 'Text')
  fireEvent.change(screen.getByRole('textbox', { name: 'zero', exact: true }), {
    target: { value: '42' },
  })
  expect(
    screen.getByRole('group', { name: 'Apply type zero' }),
  ).toHaveTextContent('"42"')
  fireEvent.click(
    screen.getByRole('button', { name: 'Apply type', exact: true }),
  )
  expect(JSON.parse(screen.getByTestId('draft').textContent!).values.zero).toBe(
    '42',
  )
})

it('removes a valid preview when the next selected conversion is rejected', async () => {
  render(<Harness />)
  await manage('zero', 'Change type')
  await chooseType('zero', 'Text')
  await chooseType('zero', 'Date')
  expect(screen.getByRole('alert')).toHaveTextContent('lose information')
  expect(
    screen.queryByRole('button', { name: 'Apply type', exact: true }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('combobox', { name: 'Property type zero' }),
  ).toHaveTextContent('Date')
  expect(JSON.parse(screen.getByTestId('draft').textContent!).values.zero).toBe(
    0,
  )
  await chooseType('zero', 'Text')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  fireEvent.click(
    screen.getByRole('button', { name: 'Apply type', exact: true }),
  )
  expect(JSON.parse(screen.getByTestId('draft').textContent!).values.zero).toBe(
    '0',
  )
})

it('revalidates a preview while the source value changes and recovers without a new selection', async () => {
  render(<Harness />)
  const field = screen.getByRole('textbox', { name: 'empty', exact: true })
  fireEvent.change(field, { target: { value: '12' } })
  await manage('empty', 'Change type')
  await chooseType('empty', 'Number')
  fireEvent.change(field, { target: { value: 'invalid' } })
  expect(screen.getByRole('alert')).toHaveTextContent('lose information')
  expect(
    screen.queryByRole('button', { name: 'Apply type', exact: true }),
  ).not.toBeInTheDocument()
  fireEvent.change(field, { target: { value: '17' } })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  fireEvent.click(
    screen.getByRole('button', { name: 'Apply type', exact: true }),
  )
  const draft = JSON.parse(screen.getByTestId('draft').textContent!)
  expect(draft.values.empty).toBe(17)
  expect(draft.definitions.empty).toEqual({ valueKind: 'number' })
})
