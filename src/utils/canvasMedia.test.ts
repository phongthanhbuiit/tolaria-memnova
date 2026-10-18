import { expect, it, vi } from 'vitest'
import { resolveCanvasMedia } from './canvasMedia'
vi.mock('@tauri-apps/api/core',() => ({ convertFileSrc: (path: string) => `asset://localhost${encodeURI(path)}` }))
it('resolves portable Unicode paths against a moved Library without rewriting the stored source', () => {
  const source = 'attachments/ảnh%20trí%20nhớ.png'
  expect(resolveCanvasMedia(source,{vaultPath:'/new/root',notePath:'/new/root/lessons/page.md'})).toEqual({ url:'asset://localhost/new/root/attachments/%E1%BA%A3nh%20tr%C3%AD%20nh%E1%BB%9B.png',relativePath:'attachments/ảnh trí nhớ.png',path:'/new/root/attachments/ảnh trí nhớ.png' })
  expect(source).toBe('attachments/ảnh%20trí%20nhớ.png')
})
it.each(['asset://localhost/other/root/attachments/x.png','asset://foreign/root/attachments/x.png','file:///other/x.png','attachments/../../escape.png','attachments/%2e%2e/%2e%2e/escape.png','attachments/%2Fprivate.png','.memnova/learning.sqlite3','blob:dead','javascript:alert(1)'])('rejects foreign, private, traversal and ephemeral sources: %s', source => {
  expect(resolveCanvasMedia(source,{vaultPath:'/current/root',notePath:'/current/root/page.md'}).url).toBeNull()
})
it('resolves relative note media and reports legacy/online sources without basename fallback', () => {
  const scope={vaultPath:'/current/root',notePath:'/current/root/lessons/page.md'}
  expect(resolveCanvasMedia('../attachments/photo.png',scope).relativePath).toBe('attachments/photo.png')
  expect(resolveCanvasMedia('asset://localhost/current/root/attachments/photo.png',scope).issue).toBe('legacy')
  expect(resolveCanvasMedia('https://example.com/image.png',scope)).toEqual({url:'https://example.com/image.png',issue:'online'})
})
it('keeps explicit online media renderable without a local Library or on a custom HTTPS port', () => {
  expect(resolveCanvasMedia('https://example.com/image.png',{})).toEqual({url:'https://example.com/image.png',issue:'online'})
  expect(resolveCanvasMedia('https://example.com:8443/image.png',{vaultPath:'/root'})).toEqual({url:'https://example.com:8443/image.png',issue:'online'})
})
it('accepts the fully encoded filesystem path returned by real Tauri convertFileSrc',()=>{
  const root='/library',path='/library/attachments/ảnh nhớ.png'
  const result=resolveCanvasMedia(`asset://localhost/${encodeURIComponent(path)}`,{vaultPath:root})
  expect(result.relativePath).toBe('attachments/ảnh nhớ.png')
  expect(result.issue).toBe('legacy')
  expect(resolveCanvasMedia(`asset://localhost/${encodeURIComponent('/foreign/attachments/ảnh nhớ.png')}`,{vaultPath:root}).url).toBeNull()
})
