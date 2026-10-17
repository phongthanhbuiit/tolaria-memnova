import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { PagePropertyTools } from './PagePropertyTools'
const { state } = vi.hoisted(() => ({
  state: {
    workspace: { phase: 'legacy', client: { libraryId: 'a' }, flush: vi.fn() },
  },
}))
vi.mock('./LearningContext', () => ({
  useLearningWorkspace: () => state.workspace,
}))
vi.mock('./PagePropertyEditor', () => ({
  PagePropertyEditor: () => <div role="dialog">Typed editor</div>,
}))
it('leaves legacy editing available without opening migration and ignores a late old-owner flush', async () => {
  const props = {
    path: '/a/page.md',
    content: '# Page',
    frontmatter: {},
    locale: 'en' as const,
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
  }
  const { rerender } = render(
    <PagePropertyTools
      content={props.content}
      frontmatter={props.frontmatter}
      locale={props.locale}
      onUpdate={props.onUpdate}
      onRemove={props.onRemove}
      path={props.path}
    />,
  )
  expect(screen.getByRole('button', { name: 'Page properties' })).toBeDisabled()
  expect(state.workspace.flush).not.toHaveBeenCalled()
  let finish!: () => void
  state.workspace = {
    phase: 'ready',
    client: { libraryId: 'a' },
    flush: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    ),
  }
  rerender(
    <PagePropertyTools
      content={props.content}
      frontmatter={props.frontmatter}
      locale={props.locale}
      onUpdate={props.onUpdate}
      onRemove={props.onRemove}
      path={props.path}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Page properties' }))
  state.workspace = {
    phase: 'ready',
    client: { libraryId: 'b' },
    flush: vi.fn(),
  }
  rerender(
    <PagePropertyTools
      content={props.content}
      frontmatter={props.frontmatter}
      locale={props.locale}
      onUpdate={props.onUpdate}
      onRemove={props.onRemove}
      path="/b/page.md"
    />,
  )
  await act(async () => finish())
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
