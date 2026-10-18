import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NoteMemoryEditorTabs } from './NoteMemoryEditorTabs'

describe('note memory face tabs', () => {
  it('names article and mnemonic separately and keeps only the selected tab in the tab order', () => {
    render(<NoteMemoryEditorTabs activeFace="front" hasBack panelId="memory-panel" locale="vi" onChangeFace={vi.fn()} onAddBack={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Bài viết' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Gợi nhớ' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tab', { name: 'Bài viết' })).toHaveAttribute('aria-controls', 'memory-panel')
  })
  it('supports arrow-key switching and focus without inserting content', () => {
    const change = vi.fn(), add = vi.fn()
    render(<NoteMemoryEditorTabs activeFace="front" hasBack panelId="memory-panel" locale="en" onChangeFace={change} onAddBack={add} />)
    const article = screen.getByRole('tab', { name: 'Article' })
    article.focus()
    fireEvent.keyDown(article, { key: 'ArrowRight' })
    expect(change).toHaveBeenCalledWith('back')
    expect(screen.getByRole('tab', { name: 'Mnemonic' })).toHaveFocus()
    expect(add).not.toHaveBeenCalled()
  })
  it('offers explicit mnemonic creation for a configured note without a back', () => {
    const add = vi.fn()
    render(<NoteMemoryEditorTabs activeFace="front" hasBack={false} panelId="memory-panel" locale="en" onChangeFace={vi.fn()} onAddBack={add} />)
    expect(screen.queryByRole('tab', { name: 'Mnemonic' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add mnemonic' }))
    expect(add).toHaveBeenCalledOnce()
  })
})
