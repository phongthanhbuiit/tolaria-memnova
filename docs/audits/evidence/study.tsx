// Standalone renderer QA. Uses disposable fixtures; not native scheduling evidence.
// Component/browser fixture only: no SQLite, filesystem persistence or review/XP claims.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '/src/components/ui/tooltip'
import { LearningStudyView } from '/src/components/learning/LearningStudyView'
import type { useLearningStudy } from '/src/hooks/useLearningStudy'
import type { StudySession } from '/src/lib/learning/types'
import snapshot from '/tests/fixtures/note-memory-study-canvas.json'
import '/src/index.css'
import '/src/App.css'
const parameters = new URLSearchParams(location.search)
const legacy = parameters.has('legacy')
const locale = parameters.get('locale') === 'en' ? 'en' : 'vi'
const theme = parameters.get('theme') === 'dark' ? 'dark' : 'light'
document.documentElement.dataset.theme = theme
document.documentElement.classList.toggle('dark', theme === 'dark')
document.documentElement.lang = locale
const article = '# Tế bào\n\nMàng bao quanh nhân tế bào.'
const mnemonic = parameters.get('content') === 'canvas'
  ? '```excalidraw id="study-renderer" height="360"\n' + JSON.stringify(snapshot) + '\n```'
  : parameters.get('content') === 'long'
    ? Array.from({ length: 20 }, (_, index) => `Dòng ${index + 1}: màng là cổng, nhân là thư viện.`).join('\n\n')
    : 'Màng là cổng, nhân là thư viện.'
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
      title: parameters.get('title') === 'long' ? 'Ghi nhớ cấu trúc tế bào — '.repeat(9).slice(0, 200) : 'Tế bào và trí nhớ',
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
export function Harness() {
  const [session, setSession] = useState(() => parameters.get('state') === 'completed' ? { ...initial, status: 'completed' as const, current: null, completedCount: 1, reviewCount: 1 } : parameters.get('state') === 'waiting' ? { ...initial, current: null, waitingUntil: Date.now() + 60_000 } : initial),
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
      <LearningStudyView study={study} root="/fixture" locale={locale} />
    </TooltipProvider>
  )
}
createRoot(document.getElementById('note-study-root')!).render(<Harness />)
