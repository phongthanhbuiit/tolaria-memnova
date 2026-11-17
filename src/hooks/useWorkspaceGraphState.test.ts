import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { workspaceIdentityFromVault } from '../utils/workspaces'
import { useVisibleWorkspaceEntries } from './useWorkspaceGraphState'

describe('single-workspace entries during source save and navigation', () => {
  it('retains unchanged target identities when the source metadata changes', () => {
    const workspace = workspaceIdentityFromVault({ path: '/vault', label: 'Library' })
    const source = makeEntry({ path: '/vault/source.md', workspace })
    const target = makeEntry({ path: '/vault/target.md', workspace })
    const { result, rerender } = renderHook(({ entries }) => useVisibleWorkspaceEntries({
      entries, multiWorkspaceEnabled: false,
    }), { initialProps: { entries: [source, target] } })
    const visibleTarget = result.current[1]

    rerender({ entries: [{ ...source, snippet: 'Inserted [[target]]', modifiedAt: 1 }, target] })

    expect(result.current[1]).toBe(visibleTarget)
    expect(result.current[0].snippet).toBe('Inserted [[target]]')
    expect(result.current[0].workspace).toBeUndefined()
    expect(result.current[1].workspace).toBeUndefined()
    expect(target.workspace).toBe(workspace)
  })
})
