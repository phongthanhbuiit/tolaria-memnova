import type { SessionScope } from './types'
/** Canonical legacy scopes preserve pre-lane session JSON, so resume finds the same session. */
export function normalizeSessionScope(value: unknown): SessionScope {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid study scope')
  const input = value as Record<string, unknown>
  if (Object.keys(input).some((key) => key !== 'pageIds' && key !== 'lane'))
    throw Error('Invalid study scope')
  if (input.lane != null && input.lane !== 'notes' && input.lane !== 'legacy')
    throw Error('Invalid study lane')
  if (
    input.pageIds != null &&
    (!Array.isArray(input.pageIds) ||
      input.pageIds.some((id) => typeof id !== 'string'))
  )
    throw Error('Invalid study page scope')
  const pageIds =
    input.pageIds == null
      ? null
      : [...new Set(input.pageIds as string[])].sort()
  return input.lane === 'notes' ? { lane: 'notes', pageIds } : { pageIds }
}
