import { render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { SidebarTopNav } from './SidebarTopNav'

it('keeps count badges neutral when selection moves between navigation items', () => {
  const props = { onSelect: vi.fn(), showInbox: true, inboxCount: 12, activeCount: 21, archivedCount: 3, reviewCount: 2 }
  const view = render(<SidebarTopNav {...props} selection={{ kind: 'filter', filter: 'all' }} />)
  const all = screen.getByRole('button', { name: /^All Notes/ })
  const inbox = screen.getByRole('button', { name: /^Inbox/ })
  const study = screen.getByRole('button', { name: /^Study/ })
  for (const row of [all, inbox, study]) {
    const badge = within(row).getByTestId('sidebar-count-chip')
    expect(badge).toHaveStyle({ background: 'var(--muted)' })
    expect(badge).toHaveClass('text-muted-foreground')
    expect(badge).not.toHaveClass('bg-primary', 'text-primary-foreground')
  }
  expect(all).toHaveClass('bg-primary/10', 'text-primary')
  view.rerender(<SidebarTopNav {...props} selection={{ kind: 'filter', filter: 'inbox' }} />)
  expect(inbox).toHaveClass('bg-primary/10', 'text-primary')
  expect(all).not.toHaveClass('bg-primary/10')
  expect(within(all).getByTestId('sidebar-count-chip')).toHaveStyle({ background: 'var(--muted)' })
  expect(within(inbox).getByTestId('sidebar-count-chip')).toHaveStyle({ background: 'var(--muted)' })
})
