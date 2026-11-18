import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import { expect, it, vi } from 'vitest'
import { LearningStudyView } from './LearningStudyView'
vi.mock('../BlockNoteReadOnly', () => ({ BlockNoteReadOnly: ({ content }: { content: string }) => <div>{content}</div> }))
import type { useLearningStudy } from '../../hooks/useLearningStudy'
const { renderer, previewClient, workspaceOverlay } = vi.hoisted(() => ({
  renderer: {
    ready: true,
    statuses: new Map<
      string,
      (status: 'loading' | 'ready' | 'error') => void
    >(),
  },
  previewClient: { readStudyPage: vi.fn() },
  workspaceOverlay: { current: {} as Record<string, unknown> },
}))
vi.mock('./LearningContext', () => ({
  useLearningWorkspace: () => ({ root: '/library', client: previewClient, ...workspaceOverlay.current }),
}))
vi.mock('../FlashcardStudyView', () => ({
  BlockNoteReadOnly: ({
    content,
    onReady,
    notePath,
    onRenderStatus,
  }: {
    content: string
    onReady?: () => void
    notePath?: string
    onRenderStatus?: (status: 'loading' | 'ready' | 'error') => void
  }) => {
    const callback = useRef(onReady)
    useEffect(() => {
      callback.current = onReady
    }, [onReady])
    useEffect(() => {
      if (onRenderStatus) renderer.statuses.set(content, onRenderStatus)
      onRenderStatus?.(renderer.ready ? 'ready' : 'loading')
      if (renderer.ready) callback.current?.()
    }, [content, notePath, onRenderStatus])
    return (
      <div data-note-path={notePath}>
        {renderer.ready ? content : 'Loading test content'}
      </div>
    )
  },
}))
function fixture(rate = vi.fn(), close = vi.fn()) {
  return {
    open: true,
    busy: false,
    error: null,
    rate,
    close,
    undo: vi.fn(),
    retry: vi.fn(),
    reload: vi.fn(),
    skip: vi.fn(),
    hasPending: false,
    session: {
      id: 'session',
      revision: 0,
      currentIndex: 0,
      initialCount: 1,
      completedCount: 0,
      reviewCount: 0,
      status: 'active',
      canUndo: false,
      current: {
        card: {
          id: 'card',
          revision: 0,
          front: 'Question text',
          back: 'Answer text',
          properties: {},
          answerMode: 'inline',
          schedule: {
            state: 'new',
            stability: 0,
            difficulty: 0,
            elapsedDays: 0,
            scheduledDays: 0,
            reps: 0,
            lapses: 0,
            learningSteps: 0,
            lastReview: null,
            due: '2020-01-01T00:00:00Z',
            engine: 'legacy-fsrs5',
            revision: 0,
          },
        },
        page: {
          path: 'lesson.md',
          fingerprint: 'source',
          title: 'Lesson',
          content: 'Full lesson',
        },
        sourceError: null,
      },
    },
  } as unknown as ReturnType<typeof useLearningStudy>
}
it('requires revealing the answer and ignores rating shortcuts while saving', () => {
  const rate = vi.fn(),
    close = vi.fn()
  const study = fixture(rate, close)
  const { rerender } = render(
    <LearningStudyView study={study} root="/library" locale="en" />
  )
  expect(screen.getByRole('button', { name: 'Show answer' })).toHaveFocus()
  const panel = screen.getByRole('dialog')
  fireEvent.keyDown(panel, { key: '3' })
  expect(rate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
  expect(screen.getByText('Answer text')).toBeInTheDocument()
  fireEvent.keyDown(panel, { key: '3' })
  expect(rate).toHaveBeenCalledWith(3)
  rerender(
    <LearningStudyView
      study={{ ...study, busy: true }}
      root="/library"
      locale="en"
    />
  )
  fireEvent.keyDown(panel, { key: '3' })
  expect(rate).toHaveBeenCalledTimes(1)
})

it('does not reveal or grade a card until its Markdown content is rendered', () => {
  renderer.ready = false
  const study = fixture()
  render(<LearningStudyView study={study} root="/library" locale="en" />)
  expect(screen.getByRole('button', { name: 'Show answer' })).toBeDisabled()
  fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' })
  expect(
    screen.queryByRole('button', { name: /Good 3/ })
  ).not.toBeInTheDocument()
  renderer.ready = true
})

it('uses one clock for preview outcomes and interval labels, without rounding a minute into two', () => {
  let clock = Date.UTC(2026, 9, 17, 15)
  const TickingDate = new Proxy(Date, {
    construct(target, args) {
      return args.length ? Reflect.construct(target, args) : new target(clock++)
    },
  })
  vi.stubGlobal('Date', TickingDate)
  try {
    render(<LearningStudyView study={fixture()} root="/library" locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
    expect(screen.getByRole('button', { name: /^Again/ })).toHaveTextContent(
      'in 1 minute'
    )
  } finally {
    vi.unstubAllGlobals()
  }
})

it('shows vocabulary context with the question and keeps related words behind the answer', () => {
  const study = fixture()
  study.session!.current!.card.properties = {
    card_type: 'vocabulary',
    part_of_speech: 'noun',
    level: 'B2',
    synonyms: '[[Related term]]',
  }
  render(<LearningStudyView study={study} root="/library" locale="en" />)
  expect(screen.getByText('noun')).toBeInTheDocument()
  expect(screen.getByText('B2')).toBeInTheDocument()
  expect(screen.queryByText('Related term')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
  expect(screen.getByText('Synonyms')).toBeInTheDocument()
  expect(screen.getByText('Related term')).toBeInTheDocument()
})

it('renders the linked answer with its own media base and refuses a missing source', () => {
  const study = fixture()
  const item = study.session!.current!
  item.card.answerMode = 'page'
  item.card.answerPageId = 'source-id'
  item.answerPage = {
    id: 'source-id',
    path: 'nested/source.md',
    title: 'Source',
    content: 'External answer',
    fingerprint: 'external',
  }
  const { rerender } = render(
    <LearningStudyView study={study} root="/library" locale="en" />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
  expect(screen.getByText('External answer')).toBeVisible()
  expect(screen.queryByText('Full lesson')).not.toBeInTheDocument()
  expect(screen.getByText('External answer')).toHaveAttribute(
    'data-note-path',
    '/library/nested/source.md'
  )
  item.sourceError = 'Missing source'
  item.answerPage = null
  rerender(
    <LearningStudyView study={{ ...study }} root="/library" locale="en" />
  )
  expect(screen.getByRole('button', { name: 'Show answer' })).toBeDisabled()
  fireEvent.keyDown(screen.getByRole('dialog'), { key: '3' })
  expect(study.rate).not.toHaveBeenCalled()
})

it('does not leak audio from the hidden linked answer onto the question face', () => {
  const study = fixture()
  const item = study.session!.current!
  item.card.answerMode = 'page'
  item.card.answerPageId = 'source-id'
  item.answerPage = {
    id: 'source-id',
    path: 'nested/source.md',
    title: 'Source',
    content: '![[secret-answer.mp3]]',
    fingerprint: 'external',
  }
  const { container } = render(
    <LearningStudyView study={study} root="/library" locale="en" />
  )
  expect(container.querySelector('audio')).not.toBeInTheDocument()
  expect(document.querySelector('audio')).not.toBeInTheDocument()
})

it('keeps preview keyboard events from rating the underlying study card', async () => {
  const study = fixture()
  const item = study.session!.current!
  item.card.answerMode = 'page'
  item.card.answerPageId = 'source-id'
  item.answerPage = {
    id: 'source-id',
    path: 'source.md',
    title: 'Source',
    content: 'External answer',
    fingerprint: 'external',
  }
  previewClient.readStudyPage.mockResolvedValue({
    ...item.answerPage,
    content: 'Preview content',
  })
  render(<LearningStudyView study={study} root="/library" locale="en" />)
  fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
  fireEvent.click(
    screen.getByRole('button', { name: 'Preview source: Source', exact: true })
  )
  const preview = await screen.findByRole('dialog', {
    name: 'Source',
    exact: true,
  })
  expect(await within(preview).findByText('Preview content')).toBeVisible()
  fireEvent.keyDown(preview, { key: '3' })
  expect(study.rate).not.toHaveBeenCalled()
  fireEvent.click(
    within(preview).getByRole('button', { name: 'Close', exact: true })
  )
  fireEvent.keyDown(screen.getByRole('dialog'), { key: '3' })
  expect(study.rate).toHaveBeenCalledWith(3)
})

it('renders a new snapshot after source reload even when the question text is unchanged', () => {
  const study = fixture()
  const item = study.session!.current!
  item.card.answerMode = 'page'
  item.card.answerPageId = 'source-id'
  item.answerPage = {
    id: 'source-id',
    path: 'source.md',
    title: 'Source',
    content: 'First answer',
    fingerprint: 'first',
  }
  const { rerender } = render(
    <LearningStudyView study={study} root="/library" locale="en" />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
  expect(screen.getByRole('button', { name: /^Good/ })).toBeEnabled()
  item.answerPage = {
    ...item.answerPage,
    content: 'Changed answer',
    fingerprint: 'changed',
  }
  rerender(
    <LearningStudyView study={{ ...study }} root="/library" locale="en" />
  )
  expect(screen.getByRole('button', { name: 'Show answer' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
  expect(screen.getByText('Changed answer')).toBeVisible()
  expect(screen.getByRole('button', { name: /^Good/ })).toBeEnabled()
})

function noteFixture() {
  const study = fixture()
  const item = study.session!.current!
  item.content = {
    kind: 'note',
    details: {
      backSource: {
        pageId: 'source-id',
        path: 'nested/mnemonic.md',
        face: 'back',
      },
      propertiesRaw: 'image: secret-property.png',
      frontMedia: [],
      backMedia: [],
      fingerprint: 'complete-snapshot-one',
    },
  }
  item.page = { ...item.page!, content: 'Live A4 article' }
  item.answerPage = {
    id: 'source-id',
    path: 'nested/mnemonic.md',
    title: 'Mnemonic source',
    content: 'Live mnemonic canvas',
    fingerprint: 'back-one',
  }
  item.card.properties = {
    image: 'secret-property.png',
    audio: 'secret-property.mp3',
    IPA: 'stale pronunciation',
    card_type: 'vocabulary',
    synonyms: '[[Hidden vocabulary]]',
  }
  return study
}
it('studies the live Markdown article and mnemonic, hiding the opposite face and all legacy property media', () => {
  const study = noteFixture()
  render(<LearningStudyView study={study} root="/library" locale="en" />)
  expect(screen.getByText('Live A4 article')).toBeVisible()
  expect(screen.queryByText('Question text')).not.toBeInTheDocument()
  expect(screen.queryByText('stale pronunciation')).not.toBeInTheDocument()
  expect(document.querySelector('audio,img')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Show mnemonic' }))
  expect(screen.getByText('Live mnemonic canvas')).toBeVisible()
  expect(screen.queryByText('Answer text')).not.toBeInTheDocument()
  expect(screen.queryByText('Live A4 article')).not.toBeVisible()
  expect(screen.getByText('Live mnemonic canvas')).toHaveAttribute(
    'data-note-path',
    '/library/nested/mnemonic.md'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Back to note' }))
  expect(screen.getByText('Live A4 article')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: /^Good/ })
  ).not.toBeInTheDocument()
  expect(study.rate).not.toHaveBeenCalled()
})
it('revokes grading on loading or errors and acknowledges a new complete snapshot with unchanged text', () => {
  const study = noteFixture()
  const { rerender } = render(
    <LearningStudyView study={study} root="/library" locale="en" />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Show mnemonic' }))
  expect(screen.getByRole('button', { name: /^Good/ })).toBeEnabled()
  act(() => renderer.statuses.get('Live mnemonic canvas')?.('error'))
  expect(screen.getByRole('button', { name: /^Good/ })).toBeDisabled()
  expect(screen.getByRole('alert')).toBeVisible()
  fireEvent.click(
    within(screen.getByRole('alert')).getByRole('button', { name: 'Reload' })
  )
  expect(study.reload).toHaveBeenCalledTimes(1)
  act(() => renderer.statuses.get('Live mnemonic canvas')?.('ready'))
  expect(screen.getByRole('button', { name: /^Good/ })).toBeEnabled()
  renderer.ready = false
  if (study.session!.current!.content?.kind !== 'note')
    throw Error('note fixture')
  study.session!.current!.content.details!.fingerprint = 'complete-snapshot-two'
  rerender(
    <LearningStudyView study={{ ...study }} root="/library" locale="en" />
  )
  expect(screen.getByRole('button', { name: 'Show mnemonic' })).toBeDisabled()
  expect(
    screen.queryByRole('button', { name: /^Good/ })
  ).not.toBeInTheDocument()
  renderer.ready = true
})
it('does not grade through a focused utility button or a repeated shortcut', () => {
  const study = fixture()
  render(<LearningStudyView study={study} root="/library" locale="en" />)
  fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
  fireEvent.keyDown(
    screen.getByRole('button', { name: 'Close', exact: true }),
    { key: '3' }
  )
  fireEvent.keyDown(screen.getByRole('dialog'), { key: '3', repeat: true })
  expect(study.rate).not.toHaveBeenCalled()
})

it('blocks pointer grading too if an already-read article later reports a decode failure', () => {
  const study = noteFixture()
  render(<LearningStudyView study={study} root="/library" locale="en" />)
  fireEvent.click(screen.getByRole('button', { name: 'Show mnemonic' }))
  act(() => renderer.statuses.get('Live A4 article')?.('error'))
  expect(screen.getByRole('button', { name: /^Good/ })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: /^Good/ }))
  expect(study.rate).not.toHaveBeenCalled()
})


it.each([1, 2, 3, 4])('retains focus synchronously after mouse Undo, then accepts Space and %i', (rating) => {
  const study = noteFixture()
  study.session!.canUndo = true
  const { rerender } = render(<LearningStudyView study={study} root="/library" locale="en" />)
  study.undo = vi.fn(async () => {
    study.session = { ...study.session!, canUndo: false }
    rerender(<LearningStudyView study={{ ...study }} root="/library" locale="en" />)
  })
  const undo = screen.getByRole('button', { name: 'Undo' })
  // Match Chromium pointer activation; fireEvent alone does not focus buttons.
  undo.focus()
  fireEvent.mouseDown(undo)
  fireEvent.click(undo)
  expect(study.undo).toHaveBeenCalledOnce()
  // The view must retain focus without waiting for an overlay MutationObserver.
  expect(document.activeElement).not.toBe(document.body)
  fireEvent.keyDown(document.activeElement!, { key: ' ' })
  // Native Space activation if the focused control is a button.
  if (document.activeElement instanceof HTMLButtonElement) fireEvent.click(document.activeElement)
  expect(screen.getByText('Live mnemonic canvas')).toBeVisible()
  expect(document.activeElement).not.toBe(document.body)
  fireEvent.keyDown(document.activeElement!, { key: String(rating) })
  expect(study.rate).toHaveBeenCalledWith(rating)
})


it('moves to the revealed card answer and keeps grading keys active', async () => {
  const study = fixture()
  render(<LearningStudyView study={study} root="/library" locale="en" />)
  fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
  const answer = screen.getByRole('region', { name: 'Answer' })
  const scroll = vi.fn()
  answer.scrollIntoView = scroll
  expect(answer).toHaveFocus()
  await waitFor(() => expect(scroll).toHaveBeenCalledWith({ block: 'start', inline: 'nearest', behavior: 'instant' }))
  fireEvent.keyDown(answer, { key: '4' })
  expect(study.rate).toHaveBeenCalledWith(4)
})

it('shows a matching leading question heading once while retaining the prompt', () => {
  const study = fixture()
  study.session!.current!.card.front = '\n# Lesson\n\nQuestion text'
  render(<LearningStudyView study={study} root="/library" locale="en" />)
  expect(screen.getAllByText('Lesson', { exact: true })).toHaveLength(1)
  expect(screen.getByText('Question text', { exact: true })).toBeVisible()
})

it('shows the committed grade counts and nearest due date at completion', () => {
  const study = fixture()
  const due = Date.UTC(2026, 10, 26, 12)
  study.session = Object.assign(study.session!, {
    current: null, status: 'completed', reviewCount: 3, completedCount: 2,
    summary: { grades: [0, 0, 1, 1], nextDueAt: due },
  })
  render(<LearningStudyView study={study} root="/library" locale="en" />)
  expect(screen.getByRole('dialog', { name: 'Done' })).toBeVisible()
  expect(screen.getByText('Good', { exact: true })).toBeVisible()
  expect(screen.getByText('Easy', { exact: true })).toBeVisible()
  expect(screen.getAllByText('1', { exact: true })).toHaveLength(2)
  expect(screen.getByText('Next review')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Close' })).toBeVisible()
  expect(study.rate).not.toHaveBeenCalled()
})


it.each([undefined, 'legacy'] as const)('continues only with due cards in the completed scope with lane %s', (lane) => {
  const study = fixture()
  const card = { ...study.session!.current!.card, status: 'active', pageId: 'page-b' }
  study.session = Object.assign(study.session!, {
    current: null, status: 'completed', scope: lane ? { lane, pageIds: ['page-a'] } : { pageIds: ['page-a'] },
  })
  const requestStudy = vi.fn()
  workspaceOverlay.current = {
    phase: 'ready', requestStudy, notes: [], cards: [card], clock: Date.now(),
    pages: [
      { id: 'page-a', path: 'lesson-a.md', available: true },
      { id: 'page-b', path: 'lesson-b.md', available: true },
    ],
  }
  try {
    const { rerender } = render(<LearningStudyView study={study} root="/library" locale="en" />)
    expect(screen.queryByRole('button', { name: 'Continue review' })).not.toBeInTheDocument()
    workspaceOverlay.current.cards = [{ ...card, pageId: 'page-a' }]
    rerender(<LearningStudyView study={study} root="/library" locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue review' }))
    expect(requestStudy).toHaveBeenCalledWith(['page-a'], 'legacy')
  } finally {
    workspaceOverlay.current = {}
  }
})

it('uses a single future marker in Vietnamese grade intervals', () => {
  render(<LearningStudyView study={fixture()} root="/library" locale="vi" />)
  fireEvent.click(screen.getByRole('button', { name: 'Hiện câu trả lời' }))
  const again = screen.getByRole('button', { name: /Học lại/ })
  expect(again).toHaveTextContent('1 phút nữa')
  expect(again).not.toHaveTextContent('sau 1 phút nữa')
})

it('distinguishes the return-to-note and undo icons without changing their names', () => {
  render(<LearningStudyView study={noteFixture()} root="/library" locale="en" />)
  fireEvent.click(screen.getByRole('button', { name: 'Show mnemonic' }))
  const back = screen.getByRole('button', { name: 'Back to note' }).querySelector('svg')
  const undo = screen.getByRole('button', { name: 'Undo' }).querySelector('svg')
  expect(back).toHaveAttribute('aria-hidden', 'true')
  expect(undo).toHaveAttribute('aria-hidden', 'true')
  expect(back?.innerHTML).not.toBe(undo?.innerHTML)
})

it('starts on the mnemonic and reveals the article with Space before grading', () => {
  const study = noteFixture()
  render(<LearningStudyView study={study} root="/library" locale="en" frontOrder="mnemonic" />)
  expect(screen.getByText('Live mnemonic canvas')).toBeVisible()
  expect(screen.getByText('Live A4 article')).not.toBeVisible()
  const dialog = screen.getByRole('dialog')
  fireEvent.keyDown(dialog, { key: ' ' })
  expect(screen.getByText('Live A4 article')).toBeVisible()
  expect(screen.getByRole('button', { name: /^Good/ })).toBeEnabled()
  fireEvent.keyDown(screen.getByRole('region', { name: 'Article' }), { key: '3' })
  expect(study.rate).toHaveBeenCalledWith(3)
})

it('lets the learner change only the current session order', () => {
  const study = noteFixture()
  const { rerender } = render(<LearningStudyView study={study} root="/library" locale="en" frontOrder="mnemonic" />)
  fireEvent.click(screen.getByRole('switch', { name: 'Mnemonic first in this session' }))
  expect(screen.getByText('Live A4 article')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Show mnemonic' })).toBeEnabled()
  expect(study.rate).not.toHaveBeenCalled()
  const next = { ...study, session: { ...study.session!, id: 'next' } }
  rerender(<LearningStudyView study={next} root="/library" locale="en" frontOrder="mnemonic" />)
  expect(screen.getByText('Live mnemonic canvas')).toBeVisible()
})

it('falls back to the article and offers to add an absent mnemonic', async () => {
  const study = noteFixture()
  vi.mocked(study.close).mockResolvedValue(undefined)
  study.session!.current!.answerPage = null
  const add = vi.fn()
  render(<LearningStudyView study={study} root="/library" locale="en" frontOrder="mnemonic" onAddMnemonic={add} />)
  expect(screen.getByText('Live A4 article')).toBeVisible()
  expect(screen.getByText('No mnemonic yet')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Add mnemonic', exact: true }))
  await waitFor(() => expect(add).toHaveBeenCalledWith('/library/lesson.md'))
  expect(study.rate).not.toHaveBeenCalled()
})

it('reads the article without grading when native study reports an incomplete mnemonic', async () => {
  const study = noteFixture()
  vi.mocked(study.close).mockResolvedValue(undefined)
  const item = study.session!.current!
  item.content = { kind: 'note', details: null }
  item.card.pageId = 'owner'
  item.page = null
  item.answerPage = null
  item.sourceError = 'note-source-not-ready: Draft'
  const readNoteFace = vi.fn().mockResolvedValue({
    pageId: item.card.pageId, path: 'lesson.md', face: 'front', content: 'Draft article',
    fingerprint: 'only-preview', media: [],
  })
  workspaceOverlay.current = { client: { readNoteFace } }
  try {
    const add = vi.fn()
    render(<LearningStudyView study={study} root="/library" locale="en" frontOrder="mnemonic" onAddMnemonic={add} />)
    expect(await screen.findByText('Draft article')).toBeVisible()
    expect(readNoteFace).toHaveBeenCalledWith(item.card.pageId, 'front')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: '3' })
    expect(study.rate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Add mnemonic', exact: true }))
    await waitFor(() => expect(add).toHaveBeenCalledWith('/library/lesson.md'))
  } finally {
    workspaceOverlay.current = {}
  }
})

it('returns to the first face even when switching back to a previously revealed order', () => {
  render(<LearningStudyView study={noteFixture()} root="/library" locale="en" frontOrder="mnemonic" />)
  fireEvent.click(screen.getByRole('button', { name: 'Show article', exact: true }))
  expect(screen.getByRole('button', { name: /^Good/ })).toBeEnabled()
  const order = screen.getByRole('switch', { name: 'Mnemonic first in this session' })
  fireEvent.click(order)
  fireEvent.click(order)
  expect(screen.getByText('Live mnemonic canvas')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Show article', exact: true })).toBeEnabled()
  expect(screen.queryByRole('button', { name: /^Good/ })).not.toBeInTheDocument()
})

it('requires a new typed answer after reopening a paused session', () => {
  const study = fixture()
  const typed = { ...study, presentation: { mode: 'typed' as const }, presentationVersion: 1 }
  const { rerender } = render(<LearningStudyView study={typed} root="/library" locale="en" />)
  const input = screen.getByRole('textbox', { name: 'Your answer' })
  fireEvent.change(input, { target: { value: 'Answer text' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(screen.getByRole('button', { name: /^Good/ })).toBeEnabled()
  rerender(<LearningStudyView study={{ ...typed, open: false }} root="/library" locale="en" />)
  rerender(<LearningStudyView study={{ ...typed, presentationVersion: 2 }} root="/library" locale="en" />)
  expect(screen.getByRole('textbox', { name: 'Your answer' })).toHaveValue('')
  expect(screen.queryByRole('button', { name: /^Good/ })).not.toBeInTheDocument()
})
