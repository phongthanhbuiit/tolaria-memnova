import { createTLStore, getSnapshot } from 'tldraw'
import { expect, it } from 'vitest'
import { loadWhiteboardDocument, whiteboardDocumentSnapshot } from './whiteboardSnapshot'
it('loads a new empty board before an editor session has mounted using the real tldraw store', () => {
  const store = createTLStore()
  expect(() => getSnapshot(store)).toThrow('Session state is not ready yet')
  expect(loadWhiteboardDocument(store,'{}')).toEqual({status:'ready'})
  const snapshot = whiteboardDocumentSnapshot(store)
  expect(Object.values(snapshot.store).some(record => record.typeName === 'document')).toBe(true)
  expect(Object.values(snapshot.store).some(record => record.typeName === 'page')).toBe(true)
  expect(Object.values(snapshot.store).some(record => record.typeName === 'instance')).toBe(false)
})
it('keeps invalid raw sources unchanged with real schema validation', () => {
  const store = createTLStore(), raw = '{"store":{},"schema":{"schemaVersion":999}}'
  expect(loadWhiteboardDocument(store,raw)).toEqual({status:'error'})
  expect(raw).toBe('{"store":{},"schema":{"schemaVersion":999}}')
})
