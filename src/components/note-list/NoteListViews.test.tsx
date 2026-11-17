import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VirtuosoMockContext } from 'react-virtuoso'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import { ListView } from './NoteListViews'

vi.unmock('react-virtuoso')

describe('note list updates during navigation', () => {
  it('keeps each note row mounted when a source save changes the sort order', async () => {
    const source = makeEntry({ path: '/source.md', title: 'Source' })
    const target = makeEntry({ path: '/target.md', title: 'Target' })
    const view = (entries: typeof source[], selected: string) => (
      <VirtuosoMockContext.Provider value={{ viewportHeight: 600, itemHeight: 60 }}>
        <ListView searched={entries} query="" renderItem={entry => (
          <span data-testid={entry.path} aria-current={entry.path === selected ? 'page' : undefined}>
            {entry.title}
          </span>
        )} />
      </VirtuosoMockContext.Provider>
    )
    const { rerender } = render(view([target, source], source.path))
    const targetRow = await screen.findByTestId(target.path)
    const sourceRow = await screen.findByTestId(source.path)

    rerender(view([{ ...source, modifiedAt: 1 }, target], target.path))

    expect(await screen.findByTestId(target.path)).toBe(targetRow)
    expect(screen.getByTestId(source.path)).toBe(sourceRow)
    expect(targetRow).toHaveAttribute('aria-current', 'page')
  })
})
