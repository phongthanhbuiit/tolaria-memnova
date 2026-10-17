import { fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { expect, it, vi } from 'vitest'
import { LearningStudyView } from './LearningStudyView'
import type { useLearningStudy } from '../../hooks/useLearningStudy'
const { renderer } = vi.hoisted(() => ({ renderer: { ready: true } }))
vi.mock('../FlashcardStudyView', () => ({ BlockNoteReadOnly: ({ content, onReady }: { content: string; onReady?: () => void }) => { useEffect(() => { if (renderer.ready) onReady?.() }, [onReady]); return <div>{renderer.ready ? content : 'Loading test content'}</div> } }))
function fixture(rate = vi.fn(), close = vi.fn()) {
  return { open: true, busy: false, error: null, rate, close, undo: vi.fn(), retry: vi.fn(), reload: vi.fn(), skip: vi.fn(), hasPending: false, session: { id: 'session', revision: 0, currentIndex: 0, initialCount: 1, completedCount: 0, reviewCount: 0, status: 'active', canUndo: false, current: { card: { id: 'card', revision: 0, front: 'Question text', back: 'Answer text', properties: {}, answerMode: 'inline', schedule: { state: 'new', stability: 0, difficulty: 0, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, learningSteps: 0, lastReview: null, due: '2020-01-01T00:00:00Z', engine: 'legacy-fsrs5', revision: 0 } }, page: { path: 'lesson.md', fingerprint: 'source', title: 'Lesson', content: 'Full lesson' }, sourceError: null } } } as unknown as ReturnType<typeof useLearningStudy>
}
it('requires revealing the answer and ignores rating shortcuts while saving', () => {
  const rate = vi.fn(), close = vi.fn()
  const study = fixture(rate, close)
  const { rerender } = render(<LearningStudyView study={study} root="/library" locale="en" />)
  expect(screen.getByRole('button', { name: 'Show answer' })).toHaveFocus()
  const panel = screen.getByRole('dialog')
  fireEvent.keyDown(panel, { key: '3' }); expect(rate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
  expect(screen.getByText('Answer text')).toBeInTheDocument()
  fireEvent.keyDown(panel, { key: '3' }); expect(rate).toHaveBeenCalledWith(3)
  rerender(<LearningStudyView study={{ ...study, busy: true }} root="/library" locale="en" />)
  fireEvent.keyDown(panel, { key: '3' }); expect(rate).toHaveBeenCalledTimes(1)
})

it('does not reveal or grade a card until its Markdown content is rendered', () => {
  renderer.ready = false
  const study = fixture()
  render(<LearningStudyView study={study} root="/library" locale="en" />)
  expect(screen.getByRole('button', { name: 'Show answer' })).toBeDisabled()
  fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' })
  expect(screen.queryByRole('button', { name: /Good 3/ })).not.toBeInTheDocument()
  renderer.ready = true
})

it('uses one clock for preview outcomes and interval labels, without rounding a minute into two', () => {
  let clock = Date.UTC(2026, 9, 17, 15)
  const TickingDate = new Proxy(Date, { construct(target, args) { return args.length ? Reflect.construct(target, args) : new target(clock++) } })
  vi.stubGlobal('Date', TickingDate)
  try {
    render(<LearningStudyView study={fixture()} root="/library" locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
    expect(screen.getByRole('button', { name: /^Again/ })).toHaveTextContent('in 1 min.')
  } finally { vi.unstubAllGlobals() }
})
