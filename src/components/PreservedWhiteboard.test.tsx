import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { DocumentRenderContext } from './documentRenderContext'
import { PreservedWhiteboard } from './PreservedWhiteboard'

it('explains the retained drawing and prevents grading a face that cannot be displayed', async () => {
  const report = vi.fn()
  render(<DocumentRenderContext.Provider value={report}><PreservedWhiteboard blockId="drawing" /></DocumentRenderContext.Provider>)
  expect(screen.getByText(/drawing is preserved/i)).toBeVisible()
  await waitFor(() => expect(report).toHaveBeenCalledWith('drawing', 'error'))
  expect(report).not.toHaveBeenCalledWith('drawing', 'ready')
})
