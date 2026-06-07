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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
}: UseFlashcardEditorFaceOptions): FlashcardEditorFaceState {
  const [activeFace, setActiveFace] = useState<FlashcardFace>('front')

  // Reset to 'front' when the active note path changes.
  // React derived-state-reset pattern: setState during render is safe and
  // avoids the cascading-render lint rule. Both sides normalized to null so
  // undefined vs null doesn't trigger an infinite loop when entry is absent.
  const currentPath = entry?.path ?? null
  const [prevPath, setPrevPath] = useState<string | null>(currentPath)
  if (currentPath !== prevPath) {
    setPrevPath(currentPath)
    setActiveFace('front')
  }

  const isFSRS = useMemo(() => entry ? isFSRSEnabled(entry) : false, [entry])

  // Split the full content into front + back (memoised, recomputes when content changes)
  const { front, back, hasBack } = useMemo(
    () => splitFlashcardContent(fullContent),
    [fullContent],
  )

  // Keep a stable ref to the "other face" content so we can merge on save
  // without having to re-split on every keystroke.
  const otherFaceRef = useRef<{ face: FlashcardFace; content: string }>({
    face: 'back',
    content: back,
  })

  // When full content or active face changes, update the ref for the OTHER face
  useEffect(() => {
    if (activeFace === 'front') {
      otherFaceRef.current = { face: 'back', content: back }
    } else {
      otherFaceRef.current = { face: 'front', content: front }
    }
  }, [activeFace, front, back])

  // Auto-switch to Back face when the marker first appears in the content
  // (e.g. after Inspector's "Add Back Face" button writes it to disk).
  const [prevHasBack, setPrevHasBack] = useState(hasBack)
  if (hasBack !== prevHasBack) {
    setPrevHasBack(hasBack)
    if (!prevHasBack && hasBack) {
      setActiveFace('back')
    }
  }

  // The content slice to pass to the editor
  const editorContent = isFSRS
    ? activeFace === 'front' ? front : back
    : fullContent

  // When the editor changes the slice, merge it with the other face and propagate
  const handleEditorContentChange = useCallback(
    (path: string, sliceContent: string) => {
      if (!isFSRS) {
        onContentChange(path, sliceContent)
        return
      }

      const merged =
        activeFace === 'front'
          ? joinFlashcardContent(sliceContent, otherFaceRef.current.content)
          : joinFlashcardContent(otherFaceRef.current.content, sliceContent)

      onContentChange(path, merged)
    },
    [isFSRS, activeFace, onContentChange],
  )

  // Add the back marker to the current note
  const handleAddBack = useCallback(() => {
    if (!entry) return
    const withMarker = appendFlashcardBackMarker(fullContent)
    onContentChange(entry.path, withMarker)
    // Switch to back face so user can start writing it
    setActiveFace('back')
  }, [entry, fullContent, onContentChange])

  return {
    isFSRS,
    activeFace,
    setActiveFace,
    editorContent,
    hasBack,
    handleAddBack,
    handleEditorContentChange,
  }
}
