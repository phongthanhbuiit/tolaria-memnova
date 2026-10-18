import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useLearningWorkspace } from '../components/learning/LearningContext'
import { NoteEditorDocument } from '../lib/learning/noteEditorDocument'
import {
  configureThroughNoteEditor,
  NoteEditorPersistence,
  registerNoteEditorPersistence,
} from '../lib/learning/noteEditorPersistence'
import { parseNoteMemoryDocument } from '../lib/learning/noteMemoryDocument'
import type { UseFlashcardEditorFaceOptions } from './useFlashcardEditorFace'
import type { MemoryBack, MemoryFace } from '../lib/learning/noteMemoryConfig'
import { trackEvent } from '../lib/telemetry'
import { joinVaultPath, notePathsMatch, normalizeNotePathForIdentity } from '../utils/notePathIdentity'

export function useNoteMemoryEditorFace(
  options: UseFlashcardEditorFaceOptions
) {
  const { entry, fullContent, onContentChange, flushPendingEditorChangeRef } =
    options
  const workspace = useLearningWorkspace()
  const refresh = workspace?.refresh
  const client = workspace?.phase === 'ready' ? workspace.client : null
  const path = entry?.path ?? ''
  const identity = `${workspace?.root ?? ''}\0${path}`
  const [stored, setStored] = useState(() => ({
    identity,
    document: new NoteEditorDocument(path, fullContent),
  }))
  const visit =
    stored.identity === identity
      ? stored
      : { identity, document: new NoteEditorDocument(path, fullContent) }
  if (stored !== visit) setStored(visit)
  const document = visit.document
  const state = useSyncExternalStore(document.subscribe, document.getSnapshot)
  const baseline = parseNoteMemoryDocument(document.getBaseline())
  const managed =
    state.enabled ||
    Boolean(baseline.config) ||
    Boolean(workspace?.notes?.some(row => row.view.binding && notePathsMatch(joinVaultPath(workspace.root, row.view.path), path))) ||
    /(?:^|\n)_memnova_learning_/.test(document.getBaseline())
  const pageId = baseline.pageId ?? parseNoteMemoryDocument(state.source).pageId
  const parsed = parseNoteMemoryDocument(state.source)
  const sourceBack = parsed.config?.back ?? null
  const onContentChangeRef = useRef(onContentChange)
  useLayoutEffect(() => {
    onContentChangeRef.current = onContentChange
  }, [onContentChange])

  useLayoutEffect(() => {
    document.activate()
    return document.deactivate
  }, [document])
  useLayoutEffect(() => {
    document.receive(fullContent)
  }, [document, fullContent])
  useLayoutEffect(() => {
    if (
      !managed ||
      !client ||
      !pageId ||
      !normalizeNotePathForIdentity(path).startsWith(`${normalizeNotePathForIdentity(client.vaultPath)}/`)
    )
      return
    const writer = new NoteEditorPersistence({
      client,
      pageId,
      path,
      source: document.getBaseline(),
      onSaved: (source) => document.markSaved(source),
      getCurrentSource: () => document.getSnapshot().source,
      onPropertyDraft: draft => {
        const next = document.stageProperty(draft.beforeSource, draft.afterSource, draft.key, draft.value, draft.rememberOnly)
        if (next !== null) onContentChangeRef.current(path, next)
      },
      onConfigurationDraft: (draft) => {
        const next = document.stageConfiguration(
          draft.beforeSource,
          draft.afterSource,
          draft.config,
          draft.rememberOnly
        )
        if (next !== null) onContentChangeRef.current(path, next)
      },
    })
    return registerNoteEditorPersistence(path, writer)
  }, [client, document, managed, pageId, path, state.externalVersion])

  const emit = useCallback(
    (changed: string | null) => {
      if (changed !== null) onContentChange(path, changed)
    },
    [onContentChange, path]
  )
  const getCanonicalDocument = useCallback(
    () => document.getSnapshot().source,
    [document]
  )
  const configureBack = useCallback(
    async (back: MemoryBack) => {
      if (!document.isActive() || !client) throw Error('stale-editor-visit')
      const config = parseNoteMemoryDocument(
        document.getSnapshot().source
      ).config
      if (!config) throw Error('missing-note-configuration')
      if (!(await configureThroughNoteEditor(path, { ...config, back })))
        throw Error('note-editor-configuration-unavailable')
      if (!document.isActive()) return
      if (JSON.stringify(config.back) !== JSON.stringify(back))
        trackEvent('memnova_note_back_source_changed', {
          kind: back.kind,
          face: back.kind === 'page' ? back.face : 'back',
        })
      await refresh?.()
    },
    [client, document, path, refresh]
  )
  const setActiveFace = useCallback(
    (face: MemoryFace) => {
      flushPendingEditorChangeRef?.current?.()
      const previous = document.getSnapshot().face
      document.select(face)
      if (previous !== document.getSnapshot().face)
        trackEvent('memnova_note_face_changed', { face })
    },
    [document, flushPendingEditorChangeRef]
  )
  const handleEditorContentChange = useCallback(
    (changedPath: string, content: string) =>
      emit(document.edit(changedPath, content)),
    [document, emit]
  )
  const handleRawContentChange = useCallback(
    (changedPath: string, source: string) =>
      emit(document.editRaw(changedPath, source)),
    [document, emit]
  )
  const handleAddBack = useCallback(() => {
    flushPendingEditorChangeRef?.current?.()
    const changed = document.addBack()
    emit(changed)
    if (changed !== null) trackEvent('memnova_note_mnemonic_added', {})
  }, [document, emit, flushPendingEditorChangeRef])
  return {
    managed,
    isNoteMemory: true,
    isFSRS: state.enabled,
    activeFace: state.face,
    hasBack: state.hasBack,
    editorContent: document.project(),
    conflict: state.conflict,
    linkedBack: state.linked,
    emptyBack: !parsed.back.trim(),
    sourceBack,
    configureBack,
    noteMemoryPageId: pageId,
    viewIdentity:
      state.face === 'front'
        ? 'front'
        : sourceBack?.kind === 'page'
          ? `back:page:${sourceBack.pageId}:${sourceBack.face}`
          : 'back:inline',
    getCanonicalDocument,
    setActiveFace,
    handleEditorContentChange,
    handleRawContentChange,
    handleAddBack,
  }
}
