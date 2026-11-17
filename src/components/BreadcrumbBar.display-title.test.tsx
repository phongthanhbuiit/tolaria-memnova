import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { BreadcrumbBar } from './BreadcrumbBar'
import { makeEntry } from '../test-utils/noteListTestUtils'

const common = { wordCount: 0, showDiffToggle: false, diffMode: false, diffLoading: false, onToggleDiff: vi.fn() }

it('shows the live display title while explicit filename editing retains the original stem', () => {
  const entry = makeEntry({ path: '/vault/stable-file.md', filename: 'stable-file.md', title: 'Stale title', hasH1: true })
  const original = JSON.stringify(entry)
  const rename = vi.fn()
  const view = render(<BreadcrumbBar {...common} entry={entry} content={'# Current title — Ghi chú\n\nBody.'} onRenameFilename={rename} />)
  const trigger = screen.getByTestId('breadcrumb-filename-trigger')
  expect(trigger).toHaveTextContent('Current title — Ghi chú')
  expect(trigger).toHaveAccessibleName('Current title — Ghi chú')
  expect(trigger).toHaveAccessibleDescription('Filename stable-file. Press Enter to rename')
  expect(trigger).not.toHaveTextContent('stable-file')
  fireEvent.doubleClick(trigger)
  expect(screen.getByTestId('breadcrumb-filename-input')).toHaveValue('stable-file')
  fireEvent.keyDown(screen.getByTestId('breadcrumb-filename-input'), { key: 'Escape' })
  expect(rename).not.toHaveBeenCalled()
  view.rerender(<BreadcrumbBar {...common} entry={entry} content={'# Updated title\n\nBody.'} onRenameFilename={rename} />)
  expect(screen.getByTestId('breadcrumb-filename-trigger')).toHaveTextContent('Updated title')
  fireEvent.doubleClick(screen.getByTestId('breadcrumb-filename-trigger'))
  fireEvent.change(screen.getByTestId('breadcrumb-filename-input'), { target: { value: 'chosen-file' } })
  fireEvent.keyDown(screen.getByTestId('breadcrumb-filename-input'), { key: 'Enter' })
  expect(rename).toHaveBeenCalledExactlyOnceWith('/vault/stable-file.md', 'chosen-file')
  expect(JSON.stringify(entry)).toBe(original)
})

it.each([
  { title: 'Reference Planning Notes', filename: 'reference-planning-notes.md', content: undefined, expected: 'Reference Planning Notes' },
  { title: 'Old metadata', filename: 'stable-file.md', content: '---\ntitle: Frontmatter title\n---\n\nBody.', expected: 'Frontmatter title' },
  { title: '', filename: 'fallback-name.md', content: '', expected: 'fallback-name' },
])('shows a title or an honest filename fallback for $filename', ({ title, filename, content, expected }) => {
  render(<BreadcrumbBar {...common} entry={makeEntry({ title, filename, hasH1: false })} content={content} />)
  expect(screen.getByTestId('breadcrumb-filename-trigger')).toHaveTextContent(expected)
})
