// Component/browser fixture only: no SQLite, filesystem persistence or review/XP claims.
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '../../src/components/ui/tooltip'
import { LearningStudyView } from '../../src/components/learning/LearningStudyView'
import { useLearningStudy } from '../../src/hooks/useLearningStudy'
import type { LearningClient } from '../../src/lib/learning/client'
import type { RateRequest, StudySession } from '../../src/lib/learning/types'
import snapshot from './note-memory-study-canvas.json'
import '../../src/index.css'
import '../../src/App.css'
const parameters = new URLSearchParams(location.search)
const broken = parameters.has('broken')
const legacy = parameters.has('legacy')
const article =
  '# A4 Article\n\n' +
  Array.from(
    { length: 6 },
    () =>
      'DNA stores information. A membrane is a gate, mitochondria a power station, and ribosomes a workshop. Recall these images to explain the complete article.'
  ).join('\n\n')
const mnemonic = parameters.has('undo-focus') ? '# Mnemonic text' :
  '# Visual memory\n\n' +
  (broken
    ? '![Unavailable](attachments/unverified.svg)'
    : '```excalidraw id="study-renderer" height="360"\n' +
      JSON.stringify(snapshot) +
      '\n```')
const initial: StudySession = {
  id: 'session',
  scope: { pageIds: ['owner'] },
  initialCount: 1,
  currentIndex: 0,
  status: 'active',
  revision: 0,
  updatedAt: 0,
  waitingUntil: null,
  completedCount: 0,
  reviewCount: 0,
  correctCount: 0,
  lastReviewId: null,
  canUndo: false,
  current: {
    card: {
      id: 'card',
      pageId: 'owner',
      front: legacy ? '# Legacy question' : 'Stale SQL front',
      back: legacy ? 'Legacy answer' : 'Stale SQL back',
      answerMode: 'inline',
      status: 'active',
      position: 0,
      properties: legacy
        ? {}
        : { image: 'secret-property.svg', audio: 'secret-property.mp3' },
      revision: 0,
      createdAt: 0,
      updatedAt: 0,
      schedule: {
        state: 'new',
        due: '2020-01-01T00:00:00Z',
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        lastReview: null,
        learningSteps: 0,
        engine: 'legacy-fsrs5',
        revision: 0,
      },
    },
    page: {
      id: 'owner',
      path: 'article.md',
      title: 'Study renderer fixture',
      content: article,
      fingerprint: 'article-one',
    },
    answerPage: {
      id: 'owner',
      path: 'article.md',
      title: 'Mnemonic',
      content: mnemonic,
      fingerprint: 'mnemonic-one',
    },
    sourceError: null,
    content: legacy
      ? { kind: 'legacy' }
      : {
          kind: 'note',
          details: {
            backSource: { pageId: 'owner', path: 'article.md', face: 'back' },
            propertiesRaw: '',
            frontMedia: [],
            backMedia: [],
            fingerprint: 'complete-one',
          },
        },
  },
}
let finishRefresh: () => void
const undoRefresh = new Promise<void>(resolve => { finishRefresh = resolve })
const refreshCommitted = () => parameters.has('stable-snapshot') ? Promise.resolve() : undoRefresh
const restored = { ...initial, initialCount: 2, revision: 2 }
const undoClient = {
  vaultPath: '/fixture', libraryId: 'undo-focus',
  startSession: async () => ({ ...initial, initialCount: 2, currentIndex: parameters.has('stable-snapshot') ? 0 : 1, canUndo: true, lastReviewId: 'previous-review' }),
  undoReview: async () => restored,
  rateCard: async (request: RateRequest) => {
    document.documentElement.dataset.lastRating = String(request.rating)
    return { session: { ...restored, status: 'completed', current: null, reviewCount: 1 }, replayed: false }
  },
  pauseSession: async () => {},
} as unknown as LearningClient
export function UndoHarness() {
  const study = useLearningStudy(undoClient, refreshCommitted)
  const { start } = study
  useEffect(() => {
    void start()
    const complete = (event: KeyboardEvent) => { if (event.key === 'F8') finishRefresh() }
    window.addEventListener('keydown', complete)
    return () => window.removeEventListener('keydown', complete)
  }, [start])
  return <TooltipProvider><LearningStudyView study={study} root="/fixture" locale="en" /></TooltipProvider>
}

export function Harness() {
  const [session, setSession] = useState(initial),
    [open, setOpen] = useState(true)
  const study = {
    libraryKey: 'renderer-fixture',
    session,
    open,
    busy: false,
    error: null,
    hasPending: false,
    close: async () => setOpen(false),
    reload: async () =>
      setSession((previous) => ({
        ...previous,
        revision: previous.revision + 1,
        current: previous.current
          ? {
              ...previous.current,
              page: previous.current.page
                ? { ...previous.current.page, fingerprint: crypto.randomUUID() }
                : null,
            }
          : null,
      })),
    rate: async () =>
      setSession((previous) => ({
        ...previous,
        status: 'completed',
        current: null,
        completedCount: 1,
        reviewCount: 1,
      })),
    undo: async () => {},
    retry: async () => {},
    skip: async () => {},
    start: async () => {},
  } satisfies ReturnType<typeof useLearningStudy>
  return (
    <TooltipProvider>
      <LearningStudyView study={study} root="/fixture" locale="en" />
    </TooltipProvider>
  )
}
createRoot(document.getElementById('note-study-root')!).render(parameters.has('undo-focus') ? <UndoHarness /> : <Harness />)
