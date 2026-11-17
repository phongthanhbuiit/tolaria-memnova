import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { BreadcrumbBar } from './BreadcrumbBar'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { translate } from '../lib/i18n'

const common = { entry: makeEntry(), wordCount: 0, showDiffToggle: true, diffMode: false, diffLoading: false, onToggleDiff: vi.fn() }

it('groups note, view and file actions without changing natural Tab order', () => {
  const toggleRaw = vi.fn()
  render(<BreadcrumbBar {...common} onToggleRaw={toggleRaw} onToggleOrganized={vi.fn()} onRevealFile={vi.fn()} onCopyFilePath={vi.fn()} />)
  const note = screen.getByRole('group', { name: translate('en', 'command.group.note') })
  const view = screen.getByRole('group', { name: translate('en', 'command.group.view') })
  expect(within(note).getByRole('button', { name: 'Add to favorites' })).not.toHaveAttribute('tabindex', '-1')
  const raw = within(view).getByRole('button', { name: translate('en', 'editor.toolbar.rawOpen') })
  fireEvent.click(raw)
  expect(toggleRaw).toHaveBeenCalledOnce()
  expect(note.compareDocumentPosition(view) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.getByRole('group', { name: 'File actions' })).toBeInTheDocument()
})

it('gives every outer toolbar icon a translated accessible name and focus tooltip in Vietnamese', async () => {
  const { container } = render(<BreadcrumbBar {...common} locale="vi" inspectorCollapsed onToggleRaw={vi.fn()} onToggleFavorite={vi.fn()} onToggleOrganized={vi.fn()} onToggleNoteWidth={vi.fn()} onToggleTableOfContents={vi.fn()} onToggleInspector={vi.fn()} onRevealFile={vi.fn()} onCopyFilePath={vi.fn()} onEnterNeighborhood={vi.fn()} />)
  const buttons = container.querySelectorAll<HTMLButtonElement>('.breadcrumb-bar__actions button')
  expect(buttons.length).toBeGreaterThanOrEqual(10)
  for (const button of buttons) {
    const label = button.getAttribute('aria-label')
    expect(label).toBeTruthy()
    expect(label).not.toMatch(/^(Open|Close|Add|Remove|More|Reveal|Copy|Mark)/)
    act(() => { fireEvent.focus(button) })
    expect(await screen.findByRole('tooltip', {}, { onTimeout: error => new Error(`${label}: ${error.message}`) })).toHaveTextContent(label ?? '')
    act(() => { fireEvent.blur(button) })
  }
})

it('localizes the optional review action instead of leaking English copy', () => {
  render(<BreadcrumbBar {...common} locale="vi" onScheduleForReview={vi.fn()} fsrsDueDate="today" />)
  expect(screen.getByRole('button', { name: 'Đến hạn hôm nay' })).toBeInTheDocument()
  expect(screen.queryByText('Due today')).not.toBeInTheDocument()
})
