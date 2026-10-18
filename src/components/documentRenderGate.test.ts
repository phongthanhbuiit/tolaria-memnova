import { expect, it, vi } from 'vitest'
import { createDocumentRenderGate, documentCanvasIds } from './documentRenderGate'
it('waits for all expected canvases to load and never acknowledges a failed board as ready', () => {
  const changed = vi.fn(), gate = createDocumentRenderGate(['a','b'],changed)
  gate.start(); gate.report('a','ready'); expect(changed).toHaveBeenLastCalledWith('loading')
  gate.report('b','error'); expect(changed).toHaveBeenLastCalledWith('error')
  expect(changed.mock.calls.some(([status]) => status === 'ready')).toBe(false)
  gate.report('b','ready'); expect(changed).toHaveBeenLastCalledWith('ready')
  gate.report('a','loading'); expect(changed).toHaveBeenLastCalledWith('loading')
})
it('ignores unknown blocks and late reports after disposal', () => {
  const changed = vi.fn(), gate = createDocumentRenderGate(['expected'],changed)
  gate.start(); gate.report('foreign','ready'); gate.dispose(); gate.report('expected','ready')
  expect(changed.mock.calls).toEqual([['loading']])
})
it('acknowledges ordinary documents while retaining missing canvas identities as pending', () => {
  const changed = vi.fn(), gate = createDocumentRenderGate([],changed)
  gate.start(); expect(changed).toHaveBeenLastCalledWith('ready')
  expect(documentCanvasIds([{ type: 'paragraph',children: [{ type: 'tldrawBlock',id: 'nested' }] },{ type: 'tldrawBlock' }])).toEqual(['nested','missing-canvas-id'])
})
