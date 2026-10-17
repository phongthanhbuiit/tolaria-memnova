import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke, updateMockContent } from '../mock-tauri'
import { updateMockFrontmatter } from '../hooks/mockFrontmatterHelpers'
import type { SchedulePatch } from '../hooks/useFlashcardSession'

/** Native writes are one atomic command. The browser path is a QA fixture only. */
export async function persistLegacySchedule(path: string, patch: SchedulePatch): Promise<string> {
  if (isTauri()) return invoke<string>('update_fsrs_schedule', { path, patch })
  const original = await mockInvoke<string>('get_note_content', { path })
  let content = original
  for (const [key, value] of Object.entries(patch)) {
    updateMockContent(path, content)
    content = updateMockFrontmatter(path, key, value)
  }
  updateMockContent(path, original)
  await mockInvoke('save_note_content', { path, content })
  return content
}
