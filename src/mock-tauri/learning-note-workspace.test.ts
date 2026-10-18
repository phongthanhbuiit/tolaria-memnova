import { expect, it, vi } from 'vitest'
import { mockLearningCommand } from './learning'
import { makeEntry } from '../test-utils/noteListTestUtils'
import type { NoteWorkspaceSnapshot } from '../lib/learning/types'
it('syncs explicitly configured notes without assigning an identity to ordinary files or writing their bytes', async () => {
  const root = `/qa/workspace-${crypto.randomUUID()}`
  const owner = '00000000-0000-0000-0000-000000000001',
    disabled = '00000000-0000-0000-0000-000000000002'
  const files = new Map([
    [
      `${root}/owner.md`,
      `---\n_memnova_page_id: ${owner}\n_memnova_learning_version: 1\n_memnova_learning_enabled: true\n_memnova_back_kind: inline\n---\nArticle\n<!-- FLASHCARD:BACK -->\nMnemonic\n`,
    ],
    [
      `${root}/disabled.md`,
      `---\n_memnova_page_id: ${disabled}\n_memnova_learning_version: 1\n_memnova_learning_enabled: false\n_memnova_back_kind: inline\n---\nDisabled article\n`,
    ],
    [`${root}/plain.md`, '# Plain note\n'],
  ])
  const write = vi.fn(),
    context = {
      write,
      read: async (path: string) => {
        const source = files.get(path)
        if (source === undefined) throw Error('missing')
        return source
      },
      entries: async () =>
        [...files.keys()].map((path) =>
          makeEntry({ path, title: path.split('/').at(-1)! })
        ),
    }
  const described = (await mockLearningCommand(
    { vaultPath: root, request: { kind: 'describe' } },
    context
  )) as { libraryId: string }
  const call = () =>
    mockLearningCommand(
      {
        vaultPath: root,
        libraryId: described.libraryId,
        request: { kind: 'syncNoteWorkspace' },
      },
      context
    ) as Promise<NoteWorkspaceSnapshot>
  const before = [...files]
  const first = await call(),
    second = await call()
  expect(first.pages.map((page) => page.path)).not.toContain('plain.md')
  expect(first.notes.find((note) => note.view.pageId === owner)).toMatchObject({
    view: { state: 'ready' },
    card: { status: 'active' },
  })
  expect(
    first.notes.find((note) => note.view.pageId === disabled)
  ).toMatchObject({ view: { state: 'disabled' }, card: null })
  expect(
    second.notes.find((note) => note.view.pageId === owner)?.card?.id
  ).toBe(first.notes.find((note) => note.view.pageId === owner)?.card?.id)
  expect(write).not.toHaveBeenCalled()
  expect([...files]).toEqual(before)
})
