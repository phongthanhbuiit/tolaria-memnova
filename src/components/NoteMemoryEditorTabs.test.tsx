import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NoteMemoryEditorTabs } from './NoteMemoryEditorTabs'

describe('mnemonic editor context', () => {
  it('offers a return action without introducing learning tabs', async () => {
    const onReturn = vi.fn()
    render(<NoteMemoryEditorTabs panelId="memory-panel" locale="vi" onReturn={onReturn} />)
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByText('Gợi nhớ')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại ghi chú' }))
    expect(onReturn).toHaveBeenCalledOnce()
  })
  it('keeps a failed return recoverable', async () => {
    render(<NoteMemoryEditorTabs panelId="memory-panel" locale="en" onReturn={vi.fn().mockRejectedValue(Error('Save failed'))} />)
    fireEvent.click(screen.getByRole('button', { name: 'Back to note' }))
    expect(await screen.findByRole('alert')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Back to note' })).toBeEnabled()
  })
})
