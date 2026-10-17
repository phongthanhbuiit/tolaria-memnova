import { expect, it } from 'vitest'
import { mockHandlers } from './mock-handlers'
it('uses the same configured library root as the browser fixture lessons', () => {
  const root = mockHandlers.get_last_vault_path()
  const entries = mockHandlers.list_vault()
  expect(entries.every((entry: { path: string }) => entry.path.startsWith(`${root}/`))).toBe(true)
  expect(mockHandlers.check_vault_exists({ path: root })).toBe(true)
})
