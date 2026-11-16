import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './ui/tabs'
import { NoteMemoryEditorTabs } from './NoteMemoryEditorTabs'

describe('note navigation tabs', () => {
  it('shows one row for note, cue and Study with only the selected tab in tab order', () => {
    render(<Tabs defaultValue="front" activationMode="manual"><NoteMemoryEditorTabs hasBack showFaces showStudy panelId="memory-panel" locale="vi" onAddBack={vi.fn()} /></Tabs>)
    expect(screen.getAllByRole('tablist')).toHaveLength(1)
    expect(screen.getByRole('tab', { name: 'Ghi chú' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Gợi nhớ' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Ôn tập' })).toHaveAttribute('aria-selected', 'false')
  })
  it('moves keyboard focus without changing panels until Enter activates a tab', async () => {
    const change = vi.fn()
    render(<Tabs defaultValue="front" activationMode="manual" onValueChange={change}><NoteMemoryEditorTabs hasBack showFaces showStudy panelId="memory-panel" locale="en" onAddBack={vi.fn()} /></Tabs>)
    const article = screen.getByRole('tab', { name: 'Note' })
    article.focus()
    fireEvent.keyDown(article, { key: 'ArrowRight' })
    await vi.waitFor(() => expect(screen.getByRole('tab', { name: 'Memory cue' })).toHaveFocus())
    expect(change).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Memory cue' }), { key: 'Enter' })
    expect(change).toHaveBeenCalledWith('back')
  })
  it('keeps explicit cue creation outside the tablist when the note has no cue', () => {
    const add = vi.fn()
    render(<Tabs defaultValue="front"><NoteMemoryEditorTabs hasBack={false} showFaces showStudy panelId="memory-panel" locale="en" onAddBack={add} /></Tabs>)
    expect(screen.queryByRole('tab', { name: 'Memory cue' })).not.toBeInTheDocument()
    const action = screen.getByRole('button', { name: 'Add mnemonic' })
    expect(action.closest('[role="tablist"]')).toBeNull()
    fireEvent.click(action)
    expect(add).toHaveBeenCalledOnce()
  })
})
