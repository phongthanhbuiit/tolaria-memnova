import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { useLearningWorkspace } from '../components/learning/LearningContext'
import { NoteEditorDocument } from '../lib/learning/noteEditorDocument'
import { NoteEditorPersistence, registerNoteEditorPersistence } from '../lib/learning/noteEditorPersistence'
import { parseNoteMemoryDocument } from '../lib/learning/noteMemoryDocument'
import type { UseFlashcardEditorFaceOptions } from './useFlashcardEditorFace'
import type { MemoryFace } from '../lib/learning/noteMemoryConfig'
import { trackEvent } from '../lib/telemetry'

export function useNoteMemoryEditorFace(options: UseFlashcardEditorFaceOptions) {
  const { entry, fullContent, onContentChange, flushPendingEditorChangeRef } = options
  const workspace = useLearningWorkspace()
  const client = workspace?.phase === 'ready' ? workspace.client : null
  const path = entry?.path ?? ''
  const identity = `${workspace?.root ?? ''}\0${path}`
  const [stored, setStored] = useState(() => ({ identity, document: new NoteEditorDocument(path, fullContent) }))
  const visit = stored.identity === identity ? stored : { identity, document: new NoteEditorDocument(path, fullContent) }
  if (stored !== visit) setStored(visit)
  const document = visit.document
  const state = useSyncExternalStore(document.subscribe, document.getSnapshot)
  const baseline = parseNoteMemoryDocument(document.getBaseline())
  const managed = state.enabled || Boolean(baseline.config) || /(?:^|\n)_memnova_learning_/.test(document.getBaseline())
  const pageId = baseline.pageId ?? parseNoteMemoryDocument(state.source).pageId

  useLayoutEffect(() => { document.activate(); return document.deactivate }, [document])
  useLayoutEffect(() => { document.receive(fullContent) }, [document, fullContent])
  useLayoutEffect(() => {
    if (!managed || !client || !pageId || !path.startsWith(`${client.vaultPath}/`)) return
    const writer = new NoteEditorPersistence({ client, pageId, path, source: document.getBaseline(), onSaved: source => document.markSaved(source) })
    return registerNoteEditorPersistence(path, writer)
  }, [client, document, managed, pageId, path, state.externalVersion])

  const emit = useCallback((changed: string | null) => { if (changed !== null) onContentChange(path, changed) }, [onContentChange, path])
  const getCanonicalDocument = useCallback(() => document.getSnapshot().source, [document])
  const setActiveFace = useCallback((face: MemoryFace) => {
    flushPendingEditorChangeRef?.current?.()
    const previous = document.getSnapshot().face
    document.select(face)
    if (previous !== document.getSnapshot().face) trackEvent('memnova_note_face_changed', { face })
  }, [document, flushPendingEditorChangeRef])
  const handleEditorContentChange = useCallback((changedPath: string, content: string) => emit(document.edit(changedPath, content)), [document, emit])
  const handleRawContentChange = useCallback((changedPath: string, source: string) => emit(document.editRaw(changedPath, source)), [document, emit])
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
    emptyBack: !parseNoteMemoryDocument(state.source).back.trim(),
    getCanonicalDocument,
    setActiveFace,
    handleEditorContentChange,
    handleRawContentChange,
    handleAddBack,
  }
}
