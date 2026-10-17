import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { LearningPage } from '../../lib/learning/types'
import { PagePropertyEditor } from './PagePropertyEditor'
const { workspace } = vi.hoisted(() => ({
  workspace: {
    root: '/qa',
    phase: 'ready',
    pages: [] as LearningPage[],
    flush: vi.fn(),
    refresh: vi.fn(),
    client: {
      vaultPath: '/qa',
      libraryId: 'lib',
      ensurePage: vi.fn(),
      pagePropertyDefinitions: vi.fn(),
      setPagePropertyDefinitions: vi.fn(),
    },
  },
}))
vi.mock('./LearningContext', () => ({ useLearningWorkspace: () => workspace }))
beforeEach(() => {
  vi.resetAllMocks()
  workspace.pages = []
  workspace.flush.mockResolvedValue(undefined)
  workspace.refresh.mockResolvedValue(undefined)
  workspace.client.ensurePage.mockResolvedValue({ id: 'owner' })
  workspace.client.setPagePropertyDefinitions.mockResolvedValue({})
})
it('retries only hints after values saved and a hint failure, without writing Markdown twice', async () => {
  const update = vi.fn().mockResolvedValue(undefined),
    close = vi.fn()
  workspace.client.setPagePropertyDefinitions
    .mockRejectedValueOnce(Error('Type write failed'))
    .mockResolvedValue({})
  render(
    <PagePropertyEditor
      path="/qa/page.md"
      values={{ zero: 0 }}
      excludedKeys={[]}
      locale="en"
      onUpdate={update}
      onRemove={vi.fn()}
      onClose={close}
    />,
  )
  const input = await screen.findByRole('textbox', { name: 'zero', exact: true })
  fireEvent.change(input, { target: { value: '' } })
  expect(
    screen.getByRole('button', { name: 'Save', exact: true }),
  ).toBeDisabled()
  fireEvent.change(input, { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Values were saved, but display types were not',
  )
  expect(update).toHaveBeenCalledOnce()
  expect(update).toHaveBeenCalledWith('zero', 2, { silent: true })
  fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
  expect(update).toHaveBeenCalledOnce()
  expect(workspace.client.ensurePage).toHaveBeenCalledOnce()
  expect(workspace.client.setPagePropertyDefinitions).toHaveBeenCalledTimes(2)
})
it('does no write or page registration on no-op Save', async () => {
  const update = vi.fn(),
    close = vi.fn()
  render(
    <PagePropertyEditor
      path="/qa/page.md"
      values={{ zero: 0, flag: false }}
      excludedKeys={[]}
      locale="en"
      onUpdate={update}
      onRemove={vi.fn()}
      onClose={close}
    />,
  )
  await screen.findByRole('textbox', { name: 'zero', exact: true })
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
  expect(update).not.toHaveBeenCalled()
  expect(workspace.client.ensurePage).not.toHaveBeenCalled()
  expect(workspace.client.setPagePropertyDefinitions).not.toHaveBeenCalled()
})

it('closes after its own refresh discovers the newly registered owner', async () => {
  const close = vi.fn(),
    update = vi.fn().mockResolvedValue(undefined)
  const view = () => (
    <PagePropertyEditor
      path="/qa/page.md"
      values={{ zero: 0 }}
      excludedKeys={[]}
      locale="en"
      onUpdate={update}
      onRemove={vi.fn()}
      onClose={close}
    />
  )
  const { rerender } = render(view())
  workspace.refresh.mockImplementation(async () => {
    workspace.pages = [
      {
        id: 'owner',
        path: 'page.md',
        title: 'Page',
        available: true,
        createdAt: null,
        modifiedAt: null,
      },
    ]
    rerender(view())
  })
  fireEvent.change(await screen.findByRole('textbox', { name: 'zero', exact: true }), {
    target: { value: '2' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
})
