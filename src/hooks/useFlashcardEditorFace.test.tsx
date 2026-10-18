import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFlashcardEditorFace } from './useFlashcardEditorFace'
import { parseNoteMemoryDocument } from '../lib/learning/noteMemoryDocument'
import type { VaultEntry } from '../types'
import { LearningContext, type LearningWorkspace } from '../components/learning/LearningContext'
import type { ReactNode } from 'react'

const header = '---\n_memnova_page_id: 11111111-1111-4111-8111-111111111111\n_memnova_learning_version: 1\n_memnova_learning_enabled: false\n_memnova_back_kind: inline\n---\n'
const source = `${header}Article\n<!-- FLASHCARD:BACK -->\nMnemonic\n`
const entry = { path: '/library/a.md', properties: {} } as VaultEntry

describe('note memory editor integration', () => {
  it('shows article/mnemonic for a configured disabled note even when legacy FSRS UI is disabled', () => {
    const { result } = renderHook(() => useFlashcardEditorFace({ disableLegacy: true, entry, fullContent: source, onContentChange: vi.fn() }))
    expect(result.current.isFSRS).toBe(true)
    expect(result.current.editorContent).toBe(`${header}Article\n`)
    act(() => result.current.setActiveFace('back'))
    expect(result.current.editorContent).toBe(`${header}Mnemonic\n`)
  })
  it('flushes the outgoing face synchronously before accepting the next face edit', () => {
    const onContentChange = vi.fn()
    const flush = { current: (() => false) as (() => boolean) | null }
    const { result } = renderHook(() => useFlashcardEditorFace({ disableLegacy: true, entry, fullContent: source, onContentChange, flushPendingEditorChangeRef: flush }))
    flush.current = () => { result.current.handleEditorContentChange(entry.path, `${header}Last article stroke`); return true }
    act(() => result.current.setActiveFace('back'))
    act(() => result.current.handleEditorContentChange(entry.path, `${header}New mnemonic`))
    expect(parseNoteMemoryDocument(onContentChange.mock.calls.at(-1)![1])).toMatchObject({ front: 'Last article stroke\n', back: 'New mnemonic' })
  })
  it('resets to the article and rejects a callback captured from an older note', () => {
    const onContentChange = vi.fn()
    const { result, rerender } = renderHook(({ active }) => useFlashcardEditorFace({ disableLegacy: true, entry: active, fullContent: source, onContentChange }), { initialProps: { active: entry } })
    act(() => result.current.setActiveFace('back'))
    const stale = result.current.handleEditorContentChange
    rerender({ active: { ...entry, path: '/library/b.md' } })
    expect(result.current.activeFace).toBe('front')
    act(() => stale(entry.path, 'Late completion'))
    expect(onContentChange).not.toHaveBeenCalled()
  })
  it('leaves an ordinary literal-marker note intact', () => {
    const content = 'An example\n<!-- FLASHCARD:BACK -->\nStill ordinary'
    const { result } = renderHook(() => useFlashcardEditorFace({ disableLegacy: true, entry, fullContent: content, onContentChange: vi.fn() }))
    expect(result.current.isFSRS).toBe(false)
    expect(result.current.editorContent).toBe(content)
  })
  it('does not reset the current face when the same Library finishes connecting', () => {
    let workspace = { root: '/library', phase: 'loading', client: null } as LearningWorkspace
    const wrapper = ({ children }: { children: ReactNode }) => <LearningContext.Provider value={workspace}>{children}</LearningContext.Provider>
    const { result, rerender } = renderHook(() => useFlashcardEditorFace({ disableLegacy: true, entry, fullContent: source, onContentChange: vi.fn() }), { wrapper })
    act(() => result.current.setActiveFace('back'))
    workspace = { root: '/library', phase: 'ready', client: { libraryId: 'library', vaultPath: '/library' } } as LearningWorkspace
    rerender()
    expect(result.current.activeFace).toBe('back')
    expect(result.current.editorContent).toBe(`${header}Mnemonic\n`)
  })
})
