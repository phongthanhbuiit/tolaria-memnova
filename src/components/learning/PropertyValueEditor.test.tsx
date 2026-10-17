import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { PropertyValueEditor } from './PropertyValueEditor'
// The shared test setup stubs DayPicker; exercise the editor's date boundary here.
vi.mock('../ui/calendar', () => ({
  Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) => (
    <button onClick={() => onSelect(new Date(2028, 2, 1))}>
      March 1st, 2028
    </button>
  ),
}))
vi.mock('./SourcePagePicker', () => ({ SourcePagePicker: () => null }))
it('keeps list entries containing commas and removes an item without deleting the field', () => {
  const change = vi.fn()
  render(
    <PropertyValueEditor
      name="Topics"
      value={['a,b', '']}
      definition={{ valueKind: 'list', itemKind: 'text' }}
      locale="en"
      disabled={false}
      onChange={change}
    />,
  )
  expect(screen.getByLabelText('Topics 1')).toHaveValue('a,b')
  fireEvent.click(screen.getByRole('button', { name: 'Remove Topics 1' }))
  expect(change).toHaveBeenLastCalledWith([''])
  fireEvent.click(screen.getByRole('button', { name: 'Add item' }))
  expect(change).toHaveBeenLastCalledWith(['a,b', '', ''])
})
it('uses a calendar with local date strings instead of shifting through UTC', () => {
  const change = vi.fn()
  render(
    <PropertyValueEditor
      name="Deadline"
      value="2028-02-29"
      definition={{ valueKind: 'date' }}
      locale="en"
      disabled={false}
      onChange={change}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Deadline' }))
  fireEvent.click(screen.getByRole('button', { name: /March 1st, 2028/ }))
  expect(change).toHaveBeenCalledWith('2028-03-01')
})
