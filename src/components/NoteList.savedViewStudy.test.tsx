import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { NoteList } from './NoteList'
import { buildNoteListProps, makeIndexedEntry } from '../test-utils/noteListTestUtils'
import type { ViewFile, WorkspaceIdentity } from '../types'

const view: ViewFile = {
  filename: 'books.yml',
  definition: { name: 'Books', icon: null, color: null, sort: null, filters: { all: [{ field: 'type', op: 'equals', value: 'Book' }] } },
}

it('filters and studies every matching due note, rechecking membership when the session starts', async () => {
  const entries = Array.from({ length: 65 }, (_, i) => makeIndexedEntry(i, { isA: i === 0 ? 'Other' : 'Book' }))
  const foreign: WorkspaceIdentity = {
    id: 'other', path: '/vault/mounted', available: true, mounted: true, defaultForNewNotes: false,
    icon: null, color: null, alias: 'other', label: 'Other', shortLabel: 'O',
  }
  entries[1] = makeIndexedEntry(1, { isA: 'Book', path: '/vault/mounted/foreign.md', workspace: foreign })
  const dueByPath = new Map([0, 1, 2, 64].map(i => [entries[i].path, String(i)]))
  let finish!: () => void
  const start = vi.fn<(scope: (freshDue: ReadonlyMap<string, string>) => string[]) => Promise<void>>(
    () => new Promise(resolve => { finish = resolve }),
  )
  const { props } = buildNoteListProps({
    selection: { kind: 'view', filename: view.filename }, views: [view], entries,
    savedViewStudy: { root: '/vault', dueByPath, start },
  })
  const { rerender } = render(<NoteList {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Study due notes (2)' }))
  fireEvent.click(screen.getByRole('button', { name: 'Study due notes (2)' }))
  expect(start).toHaveBeenCalledTimes(1)
  const resolve = start.mock.calls[0][0]
  expect(resolve(new Map([...dueByPath, [entries[63].path, '63']])).sort()).toEqual(['2', '63', '64'])
  fireEvent.click(screen.getByRole('switch', { name: 'Due' }))
  expect(screen.queryByText('Note 1')).not.toBeInTheDocument()
  expect(screen.getByText('Note 64')).toBeInTheDocument()
  rerender(<NoteList {...props} entries={entries.filter((_, i) => i !== 2)} />)
  expect(resolve(dueByPath)).toEqual(['64'])
  rerender(<NoteList {...props} selection={{ kind: 'filter', filter: 'all' }} />)
  expect(screen.queryByRole('switch', { name: 'Due' })).not.toBeInTheDocument()
  expect(resolve(dueByPath)).toEqual([])
  rerender(<NoteList {...props} />)
  expect(resolve(dueByPath)).toEqual([])
  await act(async () => finish())
})

it('keeps an empty view explicitly scoped and cannot start an all-notes session', () => {
  const start = vi.fn()
  const { props } = buildNoteListProps({
    selection: { kind: 'view', filename: view.filename }, views: [view],
    savedViewStudy: { root: '/vault', dueByPath: new Map(), start },
  })
  render(<NoteList {...props} />)
  const button = screen.getByRole('button', { name: 'Study due notes (0)' })
  expect(button).toHaveAttribute('aria-disabled', 'true')
  fireEvent.click(button)
  expect(start).not.toHaveBeenCalled()
})
