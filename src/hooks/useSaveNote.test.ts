import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSaveNote } from './useSaveNote'
import { NoteEditorPersistence, registerNoteEditorPersistence } from '../lib/learning/noteEditorPersistence'
import type { NoteMemoryView, NoteWriteRequest } from '../lib/learning/types'

const mockInvokeFn = vi.fn<(cmd: string, args?: Record<string, unknown>) => Promise<null>>(() => Promise.resolve(null))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: (cmd: string, args?: Record<string, unknown>) => mockInvokeFn(cmd, args),
  updateMockContent: vi.fn(),
}))

describe('useSaveNote', () => {
  let updateContent: (path: string, content: string) => void

  beforeEach(() => {
    updateContent = vi.fn<(path: string, content: string) => void>()
    mockInvokeFn.mockClear()
  })

  it('saves content immediately via Tauri command', async () => {
    const { result } = renderHook(() => useSaveNote(updateContent))

    await act(async () => {
      await result.current.saveNote('/test/note.md', '---\ntitle: Test\n---\n\n# Test\n\nContent')
    })

    expect(mockInvokeFn).toHaveBeenCalledWith('save_note_content', {
      path: '/test/note.md',
      content: '---\ntitle: Test\n---\n\n# Test\n\nContent',
    })
    expect(updateContent).toHaveBeenCalledWith('/test/note.md', '---\ntitle: Test\n---\n\n# Test\n\nContent')
  })

  it('updates in-memory state after saving', async () => {
    const { result } = renderHook(() => useSaveNote(updateContent))

    await act(async () => {
      await result.current.saveNote('/test/a.md', 'content A')
      await result.current.saveNote('/test/b.md', 'content B')
    })

    expect(updateContent).toHaveBeenCalledTimes(2)
    expect(updateContent).toHaveBeenCalledWith('/test/a.md', 'content A')
    expect(updateContent).toHaveBeenCalledWith('/test/b.md', 'content B')
  })

  it('propagates save errors to the caller', async () => {
    mockInvokeFn.mockRejectedValueOnce(new Error('File is read-only'))
    const { result } = renderHook(() => useSaveNote(updateContent))

    await expect(
      act(async () => {
        await result.current.saveNote('/test/readonly.md', 'content')
      })
    ).rejects.toThrow('File is read-only')

    expect(updateContent).not.toHaveBeenCalled()
  })

  it('routes an owned note through its scoped writer instead of the generic file command', async () => {
    const pageId = '11111111-1111-4111-8111-111111111111'
    const saveNoteMemory = vi.fn(async (request: NoteWriteRequest) => {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(request.source))
      return { operationId: request.operationId, pageId, status: 'committed' as const, sourceHash: Array.from(new Uint8Array(digest), byte=>byte.toString(16).padStart(2,'0')).join(''), revision: 1, problem: null }
    })
    const writer = new NoteEditorPersistence({ client: { vaultPath: '/test', readNoteMemory: async () => ({ pageId, path: 'a.md', binding: null }) as NoteMemoryView, saveNoteMemory }, path: '/test/a.md', pageId, source: 'Before' })
    const dispose = registerNoteEditorPersistence('/test/a.md', writer)
    try {
      const { result } = renderHook(() => useSaveNote(updateContent))
      await act(async () => { await result.current.saveNote('/test/a.md', 'After') })
      expect(saveNoteMemory).toHaveBeenCalledOnce()
      expect(mockInvokeFn).not.toHaveBeenCalled()
      expect(updateContent).toHaveBeenCalledWith('/test/a.md', 'After')
    } finally { dispose() }
  })
})
