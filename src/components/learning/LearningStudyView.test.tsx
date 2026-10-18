import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import { expect, it, vi } from 'vitest'
import { LearningStudyView } from './LearningStudyView'
import type { useLearningStudy } from '../../hooks/useLearningStudy'
const { renderer, previewClient } = vi.hoisted(() => ({
  renderer: {
    ready: true,
    statuses: new Map<
      string,
      (status: 'loading' | 'ready' | 'error') => void
    >(),
  },
  previewClient: { readStudyPage: vi.fn() },
}))
vi.mock('./LearningContext', () => ({
  useLearningWorkspace: () => ({ root: '/library', client: previewClient }),
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
      'in 1 min.'
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
  fireEvent.click(screen.getByRole('button', { name: 'Return to article' }))
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
