import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { forwardRef, useImperativeHandle, type ReactNode } from 'react'
import type { LearningPage, NoteLearningSummary } from '../../lib/learning/types'
import { NoteMemoryList } from './NoteMemoryList'

const range = vi.hoisted(() => ({ indexes: [0], scrollToIndex: vi.fn() }))
vi.mock('react-virtuoso', () => ({
  Virtuoso: forwardRef(function VirtualRange({ data, itemContent }: {
    data: NoteLearningSummary[]
    itemContent: (index: number, row: NoteLearningSummary) => ReactNode
  }, ref) {
    useImperativeHandle(ref, () => ({ scrollToIndex: range.scrollToIndex }))
    return <>{range.indexes.map(index => <div key={data[index].view.pageId}>{itemContent(index, data[index])}</div>)}</>
  }),
}))

function collection(count: number) {
  const pages: LearningPage[] = Array.from({ length: count }, (_, index) => ({
    id: String(index), path: `${index}.md`, title: `Note ${index}`, available: true, createdAt: null, modifiedAt: null,
  }))
  const rows: NoteLearningSummary[] = pages.map(page => ({
    view: { pageId: page.id, path: page.path, sourceHash: null, config: null, hasBack: true, state: 'ready', binding: null, schedule: null, legacyCardCount: 0, diagnostics: [], pendingOperations: [] },
    card: null,
  }))
  return { rows, pages, clock: 0, locale: 'en' as const, onOpenPage: vi.fn(), scrollParent: document.createElement('div') }
}

beforeEach(() => { range.indexes = [0]; range.scrollToIndex.mockReset() })

it('keeps a pending offscreen destination attached to its note after reordering', () => {
  const props = collection(51)
  const { rerender } = render(<NoteMemoryList {...props} />)
  const first = screen.getByRole('button', { name: 'Note 0', exact: true })
  act(() => first.focus())
  fireEvent.keyDown(first, { key: 'End' })
  const rows = [...props.rows]
  rows.splice(49, 2, rows[50], rows[49])
  range.indexes = [0, 49, 50]
  rerender(<NoteMemoryList {...props} rows={rows} />)
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Note 50', exact: true }))
})

it('does not focus a replacement row after the pending destination was removed', () => {
  const props = collection(52)
  const { rerender } = render(<NoteMemoryList {...props} />)
  const first = screen.getByRole('button', { name: 'Note 0', exact: true })
  act(() => first.focus())
  fireEvent.keyDown(first, { key: 'End' })
  const rows = [...props.rows.slice(0, 51), collection(53).rows[52]]
  const pages = [...props.pages, collection(53).pages[52]]
  range.indexes = [0, 51]
  rerender(<NoteMemoryList {...props} rows={rows} pages={pages} />)
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Note 0', exact: true }))
})

it('does not revive a pending destination after it becomes unavailable', () => {
  const props = collection(51)
  const { rerender } = render(<NoteMemoryList {...props} />)
  const first = screen.getByRole('button', { name: 'Note 0', exact: true })
  act(() => first.focus())
  fireEvent.keyDown(first, { key: 'End' })
  const pages = props.pages.map(page => page.id === '50' ? { ...page, available: false } : page)
  rerender(<NoteMemoryList {...props} pages={pages} />)
  range.indexes = [0, 50]
  rerender(<NoteMemoryList {...props} />)
  expect(document.activeElement).toBe(first)
})

it('does not steal focus back when a requested row mounts after the user leaves the list', () => {
  const props = collection(51)
  const outside = document.createElement('button')
  document.body.appendChild(outside)
  try {
    const { rerender } = render(<NoteMemoryList {...props} />)
    const first = screen.getByRole('button', { name: 'Note 0', exact: true })
    act(() => first.focus())
    fireEvent.keyDown(first, { key: 'End' })
    act(() => outside.focus())
    range.indexes = [0, 50]
    rerender(<NoteMemoryList {...props} />)
    expect(document.activeElement).toBe(outside)
  } finally { outside.remove() }
})

it.each([0, 1, 50, 51, 1000])('renders and navigates a %i-note collection with unavailable rows', count => {
  const props = collection(count)
  if (count > 1) props.pages[count - 1].available = false
  const { rerender } = render(<NoteMemoryList {...props} />)
  if (!count) { expect(screen.queryAllByRole('listitem')).toHaveLength(0); return }
  const first = screen.getByRole('button', { name: 'Note 0', exact: true })
  act(() => first.focus())
  const handled = !fireEvent.keyDown(first, { key: 'End' })
  if (count <= 50) { expect(handled).toBe(false); expect(screen.getAllByRole('listitem')).toHaveLength(count); return }
  expect(range.scrollToIndex).toHaveBeenCalledWith({ index: count - 2, align: 'center', behavior: 'auto' })
  range.indexes = [count - 2, count - 1]
  rerender(<NoteMemoryList {...props} />)
  const last = screen.getByRole('button', { name: `Note ${count - 2}`, exact: true })
  expect(document.activeElement).toBe(last)
  expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(true)
  fireEvent.keyDown(last, { key: 'Home' })
  range.indexes = [0]
  rerender(<NoteMemoryList {...props} />)
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Note 0', exact: true }))
  expect(fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })).toBe(true)
})
