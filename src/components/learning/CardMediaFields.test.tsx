import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CardMediaFields } from './CardMediaFields'
const { open, invoke } = vi.hoisted(() => ({ open: vi.fn(), invoke: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open }))
vi.mock('@tauri-apps/api/core', () => ({
  invoke,
  convertFileSrc: (path: string) => `asset://${path}`,
}))
vi.mock('../../mock-tauri', () => ({ isTauri: () => true }))
it('copies selected media through existing native commands and updates only the draft', async () => {
  open.mockResolvedValue('/tmp/selected.png')
  invoke.mockResolvedValue('/qa/attachments/imported.png')
  const change = vi.fn()
  render(
    <CardMediaFields
      root="/qa"
      ownerPath="/qa/owner.md"
      properties={{}}
      visibleKeys={['audio', 'image']}
      locale="en"
      disabled={false}
      onChange={change}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Media', exact: true }))
  fireEvent.click(
    screen.getByRole('button', { name: 'Choose image', exact: true }),
  )
  await waitFor(() =>
    expect(change).toHaveBeenCalledWith('image', 'attachments/imported.png'),
  )
  expect(invoke).toHaveBeenCalledWith('copy_image_to_vault', {
    vaultPath: '/qa',
    sourcePath: '/tmp/selected.png',
  })
})
it('shows missing media errors without erasing the saved path', () => {
  const change = vi.fn()
  render(
    <CardMediaFields
      root="/qa"
      ownerPath="/qa/owner.md"
      properties={{ image: 'attachments/missing.png' }}
      visibleKeys={['image']}
      locale="en"
      disabled={false}
      onChange={change}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Media', exact: true }))
  fireEvent.error(screen.getByRole('img'))
  expect(screen.getByRole('alert')).toHaveTextContent('could not load')
  expect(screen.getByLabelText('Image')).toHaveValue('attachments/missing.png')
  expect(change).not.toHaveBeenCalled()
})
