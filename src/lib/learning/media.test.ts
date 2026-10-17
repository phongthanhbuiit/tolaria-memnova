import { expect, it, vi } from 'vitest'
import { learningMediaUrl } from './media'
vi.mock('../../mock-tauri', () => ({ isTauri: () => true }))
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (path: string) => `asset://${path}`,
}))
it('resolves property media against the owner while keeping attachment filenames portable', () => {
  expect(
    learningMediaUrl('tone.wav', '/library', '/library/nested/owner.md'),
  ).toBe('asset:///library/attachments/tone.wav')
  expect(
    learningMediaUrl(
      '../images/picture.png',
      '/library',
      '/library/nested/owner.md',
    ),
  ).toBe('asset:///library/images/picture.png')
  expect(learningMediaUrl('https://example.com/image.png', '/library')).toBe(
    'https://example.com/image.png',
  )
  expect(learningMediaUrl('javascript:alert(1)', '/library')).toBeNull()
  expect(learningMediaUrl(null, '/library')).toBeNull()
})
