import { NoteMemoryInspector } from '../../src/components/learning/NoteMemoryInspector'
import type { NoteLearningState } from '../../src/lib/learning/types'
// Renderer-only layout fixture. No filesystem, SQLite, native input or review claims.
import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '../../src/components/ui/tooltip'
import { LearningContext, type LearningWorkspace } from '../../src/components/learning/LearningContext'
import { NoteLearningPanel } from '../../src/components/learning/NoteLearningPanel'
import { NoteLearningDashboard } from '../../src/components/learning/NoteLearningDashboard'
import { NoteConversionDialog } from '../../src/components/learning/NoteConversionDialog'
import { NoteRecoveryDialog } from '../../src/components/learning/NoteRecoveryDialog'
import { NoteBackSourceDialog } from '../../src/components/learning/NoteBackSourceDialog'
import { NoteBackSourceToolbar } from '../../src/components/learning/NoteBackSource'
import { NoteMemoryEditorTabs } from '../../src/components/NoteMemoryEditorTabs'
import { TldrawWhiteboard } from '../../src/components/TldrawWhiteboard'
import { LearningStudyView } from '../../src/components/learning/LearningStudyView'
import type { useLearningStudy } from '../../src/hooks/useLearningStudy'
import type { AppLocale } from '../../src/lib/i18n'
import type { LearningClient } from '../../src/lib/learning/client'
import snapshot from './note-memory-study-canvas.json'
import '../../src/index.css'
import '../../src/App.css'
import '../../src/components/EditorTheme.css'

type Surface = 'panel' | 'dashboard' | 'conversion' | 'recovery' | 'source' | 'tabs' | 'whiteboard' | 'study' | 'toolbar' | 'inspector'
interface LayoutCase { surface: Surface; locale: AppLocale; theme: 'light' | 'dark'; noteState?: NoteLearningState | 'future'; count?: number }
declare global { interface Window { setNoteLayoutCase?: (value: LayoutCase) => void } }
const owner = '11111111-1111-4111-8111-111111111111', target = '22222222-2222-4222-8222-222222222222'
const schedule = { state: 'review', due: '2020-01-01T00:00:00Z', stability: 12, difficulty: 4, elapsedDays: 1, scheduledDays: 3, reps: 7, lapses: 2, lastReview: null, learningSteps: 0, engine: 'legacy-fsrs5', revision: 0 }
const title = 'A4 article — membrane, nucleus and energy: '.repeat(3)
const source = '# A4 Article\n\nA membrane is a gate; a nucleus is a library.\n'
const mnemonic = 'A red gate surrounds a blue library.\n'
const card = { id: 'card', pageId: owner, front: 'Retained question', back: 'Retained answer', answerMode: 'inline', status: 'active', position: 0, properties: {}, propertyDefinitions: {}, revision: 0, createdAt: 1, updatedAt: 1, schedule }
const candidate = { card, propertiesRaw: '{"opaque":9007199254740993,"nested":{"untouched":false}}', reviewCount: 8, undoneReviewCount: 1, storageFingerprint: 'b'.repeat(64) }
const page = { pageId: owner, path: 'Biology/Article.md', title, sourceHash: 'a'.repeat(64), front: source, back: mnemonic, propertiesRaw: '---\ncustom: &value [false, null]\ncopy: *value\n---\n', config: null, classification: 'conflict', issues: [], candidates: [candidate], suggestedReuseCardId: null, pageStorageFingerprint: 'c'.repeat(64), sessionFingerprint: 'd'.repeat(64), activeSessionCount: 0, media: [], fingerprint: 'f'.repeat(64) }
const client = {
  vaultPath: '/fixture', libraryId: 'fixture', supportsNoteMemory: true,
  previewNoteConversion: async () => ({ version: 1, libraryId: 'fixture', schemaVersion: 5, state: 'ready', pages: [page], fingerprint: 'e'.repeat(64) }),
  listNoteRecovery: async () => [{ operationId: 'op', pageId: owner, kind: 'save', phase: 'conflict', createdAt: 1 }],
  readNoteRecovery: async () => ({ operationId: 'op', pageId: owner, phase: 'conflict', draftSource: source + mnemonic.repeat(10), beforeSource: source, currentPath: page.path, currentSource: source.repeat(8), currentHash: 'a'.repeat(64), sourceError: null, keptSource: null, outcome: null }),
  previewNoteSource: async (path: string, face: string) => ({ pageId: target, path, face, content: source, sourceHash: 'a'.repeat(64), fingerprint: 'f'.repeat(64), media: [], hasBack: true, backLinked: false }),
  noteCompatibility: async () => null,
  listBackups: async () => [],
} as unknown as LearningClient
const pages = [{ id: owner, path: page.path, title, available: true, createdAt: null, modifiedAt: null }, { id: target, path: 'Sources/Source.md', title: 'Source note', available: true, createdAt: null, modifiedAt: null }]
const config = { version: 1, enabled: true, back: { kind: 'inline' } }
const workspace = {
  root: '/fixture', client, phase: 'ready', pages, cards: [], clock: Date.now(),
  notes: [{ view: { pageId: owner, path: page.path, config, state: 'ready', binding: { pageId: owner, cardId: 'card', sourceHash: 'a'.repeat(64), revision: 0 }, schedule, diagnostics: [], pendingOperations: [], hasBack: true, legacyCardCount: 0 }, card }],
  entries: pages.map(page => ({ path: `/fixture/${page.path}`, title: page.title, filename: page.path.split('/').at(-1), isA: 'Note', aliases: [], belongsTo: [], relatedTo: [], properties: {}, relationships: {}, archived: false, trashed: false })),
  error: null, stats: { totalXp: 20, todayReviews: 3, todayCorrect: 2, dailyGoal: 20, heatmap: [], streak: 1, todayDurationMs: 120000 },
  refresh: async () => {}, flush: async () => {}, setNoteEnabled: async () => {}, requestStudy: () => {}, scopeForPage: (id: string) => [id],
} as unknown as LearningWorkspace

export function Harness() {
  const [value, setValue] = useState<LayoutCase>({ surface: 'panel', locale: 'en', theme: 'light' })
  const [size, setSize] = useState({ height: '360', width: '600' })
  const [open, setOpen] = useState(true), [face, setFace] = useState<'front' | 'back'>('front'), [generation, setGeneration] = useState(0)
  useEffect(() => {
    window.setNoteLayoutCase = next => { setValue(next); setOpen(true); setFace('front'); setGeneration(previous => previous + 1) }
    return () => { delete window.setNoteLayoutCase }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = value.theme
    document.documentElement.lang = value.locale
    document.documentElement.dataset.noteState = value.noteState ?? 'ready'
    document.documentElement.dataset.layoutCase = `${value.surface}:${value.locale}:${value.theme}`
  }, [value])
  const { surface, locale } = value
  const selectedWorkspace = useMemo(() => {
    const state = value.noteState === 'future' ? 'ready' : value.noteState ?? 'ready'
    const due = value.noteState === 'future' ? '2099-01-01T00:00:00Z' : schedule.due
    const chosenSchedule = { ...schedule, due }
    const count = value.count ?? 1
    const chosenPages = count > 1 ? Array.from({ length: count }, (_, index) => ({ ...pages[0], id: `fixture-${index}`, path: `Biology/Note-${index}.md`, title: `Memory article ${index}` })) : pages
    const chosenNotes = state === 'ordinary' ? [] : chosenPages.slice(0, count).map(item => ({ ...workspace.notes[0], view: { ...workspace.notes[0].view, pageId: item.id, path: item.path, state, hasBack: state !== 'draft', schedule: chosenSchedule, config: { ...config, enabled: state !== 'disabled' } }, card: { ...card, id: `card-${item.id}`, pageId: item.id, schedule: chosenSchedule } }))
    return { ...workspace, pages: chosenPages, notes: chosenNotes, client: { ...client, readNoteMemory: async () => chosenNotes[0]?.view } } as unknown as LearningWorkspace
  }, [value.noteState, value.count])
  const study = { open, busy: false, error: null, pendingRating: null, close: async () => setOpen(false), reload: async () => {}, rate: async () => {}, undo: async () => {}, retry: async () => {}, skip: async () => {}, start: async () => {}, session: {
    id: 'session', scope: { lane: 'notes', pageIds: [owner] }, initialCount: 1, currentIndex: 0, status: 'active', revision: 0, updatedAt: 0, waitingUntil: null, completedCount: 0, reviewCount: 0, correctCount: 0, lastReviewId: null, canUndo: false,
    current: { card, page: { id: owner, path: page.path, title, content: source.repeat(6), fingerprint: 'a'.repeat(64) }, answerPage: { id: owner, path: page.path, title, content: '```tldraw id="layout-study" height="360"\n' + JSON.stringify(snapshot) + '\n```', fingerprint: 'b'.repeat(64) }, sourceError: null, content: { kind: 'note', details: { fingerprint: 'c'.repeat(64), backSource: { pageId: owner, path: page.path, face: 'back' }, propertiesRaw: '', frontMedia: [], backMedia: [] } } },
  } } as unknown as ReturnType<typeof useLearningStudy>
  return <TooltipProvider><LearningContext.Provider value={selectedWorkspace}><div data-layout-surface={surface} style={{ height: '100dvh', width: '100%', minWidth: 0 }}>
    {surface === 'panel' && <NoteLearningPanel path="/fixture/Biology/Article.md" locale={locale} />}
    {surface === 'dashboard' && <NoteLearningDashboard mode="home" locale={locale} onOpenPage={() => {}} legacy={<p>Retained legacy view</p>} />}
    {surface === 'conversion' && <NoteConversionDialog client={client} open={open} locale={locale} onOpenChange={setOpen} flush={workspace.flush} onUpdated={workspace.refresh} />}
    {surface === 'recovery' && <NoteRecoveryDialog client={client} open={open} locale={locale} onOpenChange={setOpen} onUpdated={workspace.refresh} />}
    {surface === 'source' && <NoteBackSourceDialog ownerPath="/fixture/Biology/Article.md" ownerPageId={owner} open={open} locale={locale} onOpenChange={setOpen} onApplyBack={async () => {}} />}
    {surface === 'toolbar' && <NoteBackSourceToolbar back={{ kind: 'inline' }} ownerPath="/fixture/Biology/Article.md" ownerPageId={owner} locale={locale} onApplyBack={async () => {}} onNavigate={() => {}} />}
    {surface === 'inspector' && <NoteMemoryInspector path="/fixture/Biology/Article.md" content={`---\n_memnova_page_id: ${owner}\n_memnova_learning_version: 1\n_memnova_learning_enabled: true\n_memnova_back_kind: inline\n---\nArticle`} locale={locale} />}
    {surface === 'tabs' && <NoteMemoryEditorTabs activeFace={face} hasBack panelId="article" locale={locale} onChangeFace={setFace} onAddBack={() => {}} />}
    {surface === 'whiteboard' && <div className="editor__blocknote-container"><TldrawWhiteboard boardId="layout" height={size.height} width={size.width} snapshot={JSON.stringify(snapshot)} onSnapshotChange={() => {}} onSizeChange={setSize} /></div>}
    {surface === 'study' && <LearningStudyView key={generation} study={study} root="/fixture" locale={locale} />}
    {!open && <p role="status">Closed</p>}
  </div></LearningContext.Provider></TooltipProvider>
}
createRoot(document.getElementById('note-memory-layout-root')!).render(<Harness />)
