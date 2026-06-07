/**
 * useFlashcardEditorFace.ts
 *
 * Manages the Front/Back tab state for the editor when a note has FSRS enabled.
 *
 * Responsibilities:
 *  1. Track which face (front | back) is active
 *  2. Split note content at the FLASHCARD:BACK marker
 *  3. Expose the content slice to render in the editor
 *  4. On content changes, merge the slice back with the other face and
 *     call the original onContentChange (so autosave sees the full content)
 *  5. Reset to 'front' when the active note path changes
 */

import { useCallback, useMemo, useState } from 'react'
import {
  splitFlashcardContent,
  joinFlashcardContent,
  appendFlashcardBackMarker,
} from '../utils/flashcardMarkdown'
import type { FlashcardFace } from '../components/FlashcardEditorTabs'
import type { VaultEntry } from '../types'
import { isFSRSEnabled } from '../lib/fsrsVaultEntry'

interface UseFlashcardEditorFaceOptions {
  entry: VaultEntry | null
  /** Full raw markdown content of the active note */
  fullContent: string
  /** Called when the editor content changes (merged front+back) */
  onContentChange: (path: string, content: string) => void
  /** Ref to flush pending editor changes before face swaps */
  flushPendingEditorChangeRef?: React.RefObject<(() => boolean) | null>
}

interface FlashcardEditorFaceState {
  /** Whether this note has FSRS enabled (show tabs) */
  isFSRS: boolean
  /** Which face is currently shown in the editor */
  activeFace: FlashcardFace
  /** Set the active face */
  setActiveFace: (face: FlashcardFace) => void
  /** Content slice to load into the editor (just the relevant face) */
  editorContent: string
  /** Whether the note already has a back face */
  hasBack: boolean
  /** Add a back marker to the note */
  handleAddBack: () => void
  /** Called by the editor when content changes — merges and propagates */
  handleEditorContentChange: (path: string, sliceContent: string) => void
}

export function useFlashcardEditorFace({
  entry,
  fullContent,
  onContentChange,
  flushPendingEditorChangeRef,
}: UseFlashcardEditorFaceOptions): FlashcardEditorFaceState {
  const [activeFace, setActiveFace] = useState<FlashcardFace>('front')

  const currentPath = entry?.path ?? null
  const [prevPath, setPrevPath] = useState<string | null>(currentPath)
  const [prevFullContent, setPrevFullContent] = useState<string>(fullContent)
  const [latestMergedContent, setLatestMergedContent] = useState<string>(fullContent)
  const [isPendingPropUpdate, setIsPendingPropUpdate] = useState(false)

  const initialHasBack = useMemo(() => splitFlashcardContent(fullContent).hasBack, [fullContent])
  const [prevHasBack, setPrevHasBack] = useState(initialHasBack)

  // Derived state reset when note path changes
  if (currentPath !== prevPath) {
    setPrevPath(currentPath)
    setActiveFace('front')
    setPrevFullContent(fullContent)
    setLatestMergedContent(fullContent)
    setIsPendingPropUpdate(false)

    const newHasBack = splitFlashcardContent(fullContent).hasBack
    setPrevHasBack(newHasBack)
  }

  // Sync external changes (such as from git sync or other panels) safely during render
  if (currentPath === prevPath) {
    if (isPendingPropUpdate) {
      if (fullContent === latestMergedContent) {
        setIsPendingPropUpdate(false)
      }
    } else if (fullContent !== prevFullContent) {
      setPrevFullContent(fullContent)
      setLatestMergedContent(fullContent)

      const externalHasBack = splitFlashcardContent(fullContent).hasBack
      setPrevHasBack(externalHasBack)
    }
  }

  const isFSRS = useMemo(() => (entry ? isFSRSEnabled(entry) : false), [entry])

  // Split the latest merged content into front + back
  const { front, back, hasBack } = useMemo(
    () => splitFlashcardContent(latestMergedContent),
    [latestMergedContent],
  )

  // Auto-switch to Back face when the marker first appears in the content
  // (e.g. after Inspector's "Add Back Face" button writes it to disk).
  if (hasBack !== prevHasBack) {
    setPrevHasBack(hasBack)
    if (!prevHasBack && hasBack) {
      setActiveFace('back')
    }
  }

  const setActiveFaceWithFlush = useCallback((nextFace: FlashcardFace) => {
    if (flushPendingEditorChangeRef?.current) {
      flushPendingEditorChangeRef.current()
    }
    setActiveFace(nextFace)
  }, [flushPendingEditorChangeRef])

  // The content slice to pass to the editor
  const editorContent = isFSRS
    ? activeFace === 'front'
      ? front
      : back
    : latestMergedContent

  // When the editor changes the slice, merge it with the other face and propagate
  const handleEditorContentChange = useCallback(
    (path: string, sliceContent: string) => {
      if (!isFSRS) {
        onContentChange(path, sliceContent)
        return
      }

      const { front: currentFront, back: currentBack } = splitFlashcardContent(latestMergedContent)

      const merged =
        activeFace === 'front'
          ? joinFlashcardContent(sliceContent, currentBack)
          : joinFlashcardContent(currentFront, sliceContent)

      setLatestMergedContent(merged)
      setPrevFullContent(merged)
      setIsPendingPropUpdate(true)
      onContentChange(path, merged)
    },
    [isFSRS, activeFace, latestMergedContent, onContentChange],
  )

  // Add the back marker to the current note
  const handleAddBack = useCallback(() => {
    if (!entry) return
    const withMarker = appendFlashcardBackMarker(latestMergedContent)
    setLatestMergedContent(withMarker)
    setPrevFullContent(withMarker)
    setIsPendingPropUpdate(true)
    onContentChange(entry.path, withMarker)
    // Switch to back face so user can start writing it
    setActiveFace('back')
  }, [entry, latestMergedContent, onContentChange])

  return {
    isFSRS,
    activeFace,
    setActiveFace: setActiveFaceWithFlush,
    editorContent,
    hasBack,
    handleAddBack,
    handleEditorContentChange,
  }
}
