import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { requestExcerptCapture, type ExcerptCapture } from '../lib/excerptCapture'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { ExcerptCaptureDialog } from './ExcerptCaptureDialog'

const entry = makeEntry({ path: '/library/note.md', title: 'Original' })
function mount() {
  const onSave = vi.fn<(capture: ExcerptCapture, isCurrent: () => boolean) => Promise<typeof entry>>()
  const onSaved = vi.fn()
  render(<ExcerptCaptureDialog active={entry} vaultPath="/library" locale="en" onSave={onSave} onSaved={onSaved} />)
  return { onSave, onSaved }
}

describe('ExcerptCaptureDialog', () => {
  it('focuses invalid fields, keeps a failed draft editable and reuses its ID for retry', async () => {
    const { onSave, onSaved } = mount()
    onSave.mockRejectedValueOnce(new Error('disk error')).mockResolvedValueOnce(entry)
    act(() => requestExcerptCapture())
    const save = screen.getByRole('button', { name: 'Save', exact: true })
    const text = screen.getByLabelText('Excerpt', { exact: true })
    const url = screen.getByLabelText('Source URL')
    fireEvent.click(save)
    expect(text).toHaveFocus()
    expect(text).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(text, { target: { value: 'A passage' } })
    fireEvent.click(save)
    expect(url).toHaveFocus()
    expect(onSave).not.toHaveBeenCalled()
    fireEvent.change(url, { target: { value: 'https://example.org' } })
    fireEvent.click(save)
    await screen.findByText(/could not save/i)
    expect(text).toHaveValue('A passage')
    expect(save).toBeEnabled()
    fireEvent.click(save)
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(entry))
    expect(onSave.mock.calls[0][0]).toEqual(onSave.mock.calls[1][0])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not capture a selection after its source editor visit was replaced', async () => {
    const { onSave } = mount()
    const isCurrent = vi.fn(() => true)
    act(() => requestExcerptCapture({ path: entry.path, text: 'Words', restoreFocus: vi.fn(), isCurrent }))
    isCurrent.mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }))
    await screen.findByText(/could not save/i)
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Excerpt', { exact: true })).toHaveValue('Words')
  })
})
