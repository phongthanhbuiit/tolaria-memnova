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
  expect(
    screen.getByRole('button', { name: 'Media', exact: true }),
  ).toHaveAttribute('aria-expanded', 'true')
  fireEvent.error(screen.getByRole('img'))
  expect(screen.getByRole('alert')).toHaveTextContent('could not load')
  expect(screen.getByLabelText('Image')).toHaveValue('attachments/missing.png')
  expect(change).not.toHaveBeenCalled()
})

it('retains a media load error across collapse without erasing a path', () => {
  const change = vi.fn()
  render(
    <CardMediaFields
      root="/qa"
      ownerPath="/qa/owner.md"
      properties={{ image: 'missing.png' }}
      visibleKeys={['image']}
      locale="en"
      disabled={false}
      onChange={change}
    />,
  )
  fireEvent.error(screen.getByRole('img'))
  expect(screen.getByRole('alert')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Media', exact: true }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Media', exact: true }))
  expect(screen.getByRole('alert')).toBeVisible()
  expect(screen.getByLabelText('Image')).toHaveValue('missing.png')
  expect(change).not.toHaveBeenCalled()
})
it('unlocks controls after the native file picker is cancelled without a copy or draft write', async () => {
  open.mockResolvedValue(null)
  invoke.mockClear()
  const busy = vi.fn(),
    change = vi.fn()
  render(
    <CardMediaFields
      root="/qa"
      properties={{}}
      visibleKeys={['image']}
      locale="en"
      disabled={false}
      onChange={change}
      onBusyChange={busy}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Media', exact: true }))
  fireEvent.click(
    screen.getByRole('button', { name: 'Choose image', exact: true }),
  )
  await waitFor(() => expect(busy).toHaveBeenLastCalledWith(false))
  expect(invoke).not.toHaveBeenCalled()
  expect(change).not.toHaveBeenCalled()
  expect(
    screen.getByRole('button', { name: 'Choose image', exact: true }),
  ).toBeEnabled()
})

it('unlocks a new Library while discarding a delayed picker result from the old one', async () => {
  let finish: (path: string) => void = () => {
    throw Error('Picker not started')
  }
  open.mockImplementationOnce(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve
      }),
  )
  invoke.mockClear()
  const change = vi.fn()
  const view = (root: string) => (
    <CardMediaFields
      root={root}
      properties={{}}
      visibleKeys={['image']}
      locale="en"
      disabled={false}
      onChange={change}
    />
  )
  const { rerender } = render(view('/old'))
  fireEvent.click(screen.getByRole('button', { name: 'Media', exact: true }))
  fireEvent.click(
    screen.getByRole('button', { name: 'Choose image', exact: true }),
  )
  rerender(view('/new'))
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Choose image', exact: true }),
    ).toBeEnabled(),
  )
  finish('/old/file.png')
  await waitFor(() =>
    expect(screen.queryByRole('status')).not.toBeInTheDocument(),
  )
  expect(invoke).not.toHaveBeenCalled()
  expect(change).not.toHaveBeenCalled()
})
