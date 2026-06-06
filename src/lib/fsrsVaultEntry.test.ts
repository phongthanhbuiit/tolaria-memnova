import { describe, it, expect } from 'vitest'
import { fsrsSchedule, createNewFSRSCard } from './fsrs'
import {
  isFSRSEnabled,
  getFSRSCard,
  isFSRSEntryDue,
  getDueReviewEntries,
  getDueReviewCount,
  getFSRSFrontmatterPatch,
  getInitialFSRSPatch,
  collectDeckMembers,
  FSRS_FIELD,
} from './fsrsVaultEntry'
import type { VaultEntry } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2026-06-06T08:00:00.000Z')

function makeEntry(overrides: Partial<VaultEntry> & { properties?: Record<string, unknown> } = {}): VaultEntry {
  const { properties = {}, ...rest } = overrides
  return {
    path: 'notes/test.md',
    filename: 'test.md',
    title: 'Test Note',
    isA: null,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: null,
    createdAt: null,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    hasH1: false,
    properties: properties as Record<string, string | number | boolean | null | Array<string | number | boolean>>,
    ...rest,
  }
}

function fsrsEntry(overrides: Record<string, unknown> = {}): VaultEntry {
  return makeEntry({
    properties: {
      [FSRS_FIELD.enabled]: true,
      [FSRS_FIELD.state]: 'new',
      [FSRS_FIELD.due]: NOW.toISOString(),
      [FSRS_FIELD.stability]: 0,
      [FSRS_FIELD.difficulty]: 0,
      [FSRS_FIELD.elapsedDays]: 0,
      [FSRS_FIELD.scheduledDays]: 0,
      [FSRS_FIELD.reps]: 0,
      [FSRS_FIELD.lapses]: 0,
      [FSRS_FIELD.lastReview]: null,
      ...overrides,
    },
  })
}

// ---------------------------------------------------------------------------
// isFSRSEnabled
// ---------------------------------------------------------------------------

describe('isFSRSEnabled', () => {
  it('returns false for a plain note', () => {
    expect(isFSRSEnabled(makeEntry())).toBe(false)
  })

  it('returns true when _fsrs_enabled is true', () => {
    expect(isFSRSEnabled(fsrsEntry())).toBe(true)
  })

  it('returns false when _fsrs_enabled is "true" (string)', () => {
    // We require actual boolean true, not string
    expect(isFSRSEnabled(makeEntry({ properties: { [FSRS_FIELD.enabled]: 'true' } }))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getFSRSCard
// ---------------------------------------------------------------------------

describe('getFSRSCard', () => {
  it('returns a new card for a plain note without FSRS fields', () => {
    const card = getFSRSCard(makeEntry())
    expect(card.state).toBe('new')
    expect(card.reps).toBe(0)
  })

  it('parses state correctly', () => {
    const entry = fsrsEntry({ [FSRS_FIELD.state]: 'review' })
    expect(getFSRSCard(entry).state).toBe('review')
  })

  it('parses numeric fields as numbers', () => {
    const entry = fsrsEntry({
      [FSRS_FIELD.stability]: 7.5,
      [FSRS_FIELD.difficulty]: 4.2,
      [FSRS_FIELD.reps]: 5,
    })
    const card = getFSRSCard(entry)
    expect(card.stability).toBe(7.5)
    expect(card.difficulty).toBe(4.2)
    expect(card.reps).toBe(5)
  })

  it('handles string numeric values (YAML might parse some as strings)', () => {
    const entry = fsrsEntry({ [FSRS_FIELD.reps]: '3' })
    expect(getFSRSCard(entry).reps).toBe(3)
  })

  it('returns null for lastReview when not set', () => {
    const entry = fsrsEntry({ [FSRS_FIELD.lastReview]: null })
    expect(getFSRSCard(entry).lastReview).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isFSRSEntryDue
// ---------------------------------------------------------------------------

describe('isFSRSEntryDue', () => {
  it('returns false for a note without FSRS enabled', () => {
    expect(isFSRSEntryDue(makeEntry(), NOW)).toBe(false)
  })

  it('returns true for a new enabled note (due = creation time)', () => {
    const entry = fsrsEntry({ [FSRS_FIELD.due]: new Date(NOW.getTime() - 1000).toISOString() })
    expect(isFSRSEntryDue(entry, NOW)).toBe(true)
  })

  it('returns false when due is in the future', () => {
    const entry = fsrsEntry({ [FSRS_FIELD.due]: new Date(NOW.getTime() + 86_400_000).toISOString() })
    expect(isFSRSEntryDue(entry, NOW)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getDueReviewEntries
// ---------------------------------------------------------------------------

describe('getDueReviewEntries', () => {
  it('returns empty array when no FSRS entries', () => {
    const entries = [makeEntry(), makeEntry({ path: 'a.md', filename: 'a.md' })]
    expect(getDueReviewEntries(entries, NOW)).toHaveLength(0)
  })

  it('returns only due enabled entries', () => {
    const duePast = fsrsEntry({ [FSRS_FIELD.due]: new Date(NOW.getTime() - 1000).toISOString() })
    const dueFuture = fsrsEntry({ [FSRS_FIELD.due]: new Date(NOW.getTime() + 86_400_000).toISOString() })
    const plain = makeEntry()

    const result = getDueReviewEntries([duePast, dueFuture, plain], NOW)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(duePast)
  })

  it('sorts new before review', () => {
    const reviewEntry = makeEntry({
      path: 'review.md',
      filename: 'review.md',
      properties: {
        [FSRS_FIELD.enabled]: true,
        [FSRS_FIELD.state]: 'review',
        [FSRS_FIELD.due]: new Date(NOW.getTime() - 1000).toISOString(),
        [FSRS_FIELD.stability]: 10,
        [FSRS_FIELD.difficulty]: 5,
        [FSRS_FIELD.elapsedDays]: 10,
        [FSRS_FIELD.scheduledDays]: 10,
        [FSRS_FIELD.reps]: 5,
        [FSRS_FIELD.lapses]: 0,
        [FSRS_FIELD.lastReview]: null,
      },
    })
    const newEntry = fsrsEntry({ [FSRS_FIELD.due]: new Date(NOW.getTime() - 2000).toISOString() })

    const result = getDueReviewEntries([reviewEntry, newEntry], NOW)
    expect(result[0]).toBe(newEntry)
    expect(result[1]).toBe(reviewEntry)
  })
})

// ---------------------------------------------------------------------------
// getDueReviewCount
// ---------------------------------------------------------------------------

describe('getDueReviewCount', () => {
  it('returns 0 when no due entries', () => {
    expect(getDueReviewCount([makeEntry()], NOW)).toBe(0)
  })

  it('counts correctly', () => {
    const due1 = fsrsEntry({ [FSRS_FIELD.due]: new Date(NOW.getTime() - 1000).toISOString() })
    const due2 = fsrsEntry({ [FSRS_FIELD.due]: new Date(NOW.getTime() - 2000).toISOString() })
    const notDue = fsrsEntry({ [FSRS_FIELD.due]: new Date(NOW.getTime() + 86_400_000).toISOString() })
    expect(getDueReviewCount([due1, due2, notDue], NOW)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// getFSRSFrontmatterPatch
// ---------------------------------------------------------------------------

describe('getFSRSFrontmatterPatch', () => {
  it('returns all required FSRS fields', () => {
    const card = createNewFSRSCard()
    const result = fsrsSchedule(card, 3, NOW)
    const patch = getFSRSFrontmatterPatch(result)

    expect(patch).toHaveProperty(FSRS_FIELD.state)
    expect(patch).toHaveProperty(FSRS_FIELD.due)
    expect(patch).toHaveProperty(FSRS_FIELD.stability)
    expect(patch).toHaveProperty(FSRS_FIELD.difficulty)
    expect(patch).toHaveProperty(FSRS_FIELD.reps)
    expect(patch).toHaveProperty(FSRS_FIELD.lapses)
    expect(patch).toHaveProperty(FSRS_FIELD.scheduledDays)
    expect(patch).toHaveProperty(FSRS_FIELD.elapsedDays)
    expect(patch).toHaveProperty(FSRS_FIELD.lastReview)
  })
})

// ---------------------------------------------------------------------------
// getInitialFSRSPatch
// ---------------------------------------------------------------------------

describe('getInitialFSRSPatch', () => {
  it('sets enabled to true and state to new', () => {
    const patch = getInitialFSRSPatch()
    expect(patch[FSRS_FIELD.enabled]).toBe(true)
    expect(patch[FSRS_FIELD.state]).toBe('new')
    expect(patch[FSRS_FIELD.reps]).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// collectDeckMembers
// ---------------------------------------------------------------------------

describe('collectDeckMembers', () => {
  function noteEntry(path: string, title: string, belongsTo: string[] = []): VaultEntry {
    return makeEntry({ path, filename: path.split('/').pop() ?? path, title, belongsTo })
  }

  it('returns empty array when no notes have belongsTo root', () => {
    const root = noteEntry('notes/root.md', 'Root')
    const other = noteEntry('notes/other.md', 'Other')
    expect(collectDeckMembers(root, [root, other])).toHaveLength(0)
  })

  it('returns direct children that belongsTo root by title', () => {
    const root = noteEntry('notes/root.md', 'Root')
    const child = noteEntry('notes/child.md', 'Child', ['[[Root]]'])
    const other = noteEntry('notes/other.md', 'Other')
    const result = collectDeckMembers(root, [root, child, other])
    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('notes/child.md')
  })

  it('recursively collects grandchildren', () => {
    const root = noteEntry('notes/root.md', 'Root')
    const child = noteEntry('notes/child.md', 'Child', ['[[Root]]'])
    const grandchild = noteEntry('notes/grandchild.md', 'Grandchild', ['[[Child]]'])
    const result = collectDeckMembers(root, [root, child, grandchild])
    expect(result).toHaveLength(2)
    expect(result.map((e) => e.path)).toContain('notes/child.md')
    expect(result.map((e) => e.path)).toContain('notes/grandchild.md')
  })

  it('excludes the root entry itself from results', () => {
    const root = noteEntry('notes/root.md', 'Root')
    const child = noteEntry('notes/child.md', 'Child', ['[[Root]]'])
    const result = collectDeckMembers(root, [root, child])
    expect(result.map((e) => e.path)).not.toContain('notes/root.md')
  })

  it('excludes notes linked only via outgoingLinks (body wikilinks)', () => {
    const root = noteEntry('notes/root.md', 'Root')
    // This note is linked in the body of root but does NOT set belongsTo
    const bodyLink = makeEntry({
      path: 'notes/keyword.md',
      filename: 'keyword.md',
      title: 'Keyword',
      belongsTo: [],
      outgoingLinks: [],
    })
    // root has outgoingLinks to keyword but keyword does not belongsTo root
    const rootWithLinks = { ...root, outgoingLinks: ['Keyword'] }
    const result = collectDeckMembers(rootWithLinks, [rootWithLinks, bodyLink])
    expect(result).toHaveLength(0)
  })

  it('prevents infinite loops with circular belongsTo references', () => {
    const a = noteEntry('notes/a.md', 'A', ['[[B]]'])
    const b = noteEntry('notes/b.md', 'B', ['[[A]]'])
    // Should not throw and should return finite result
    expect(() => collectDeckMembers(a, [a, b])).not.toThrow()
    const result = collectDeckMembers(a, [a, b])
    // B belongs to A directly, A is already visited so no infinite loop
    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('notes/b.md')
  })

  it('deduplicates entries that appear via multiple paths', () => {
    const root = noteEntry('notes/root.md', 'Root')
    const child1 = noteEntry('notes/c1.md', 'C1', ['[[Root]]'])
    // grandchild belongs to both root and child1 — should appear only once
    const grandchild = noteEntry('notes/gc.md', 'GC', ['[[Root]]', '[[C1]]'])
    const result = collectDeckMembers(root, [root, child1, grandchild])
    const paths = result.map((e) => e.path)
    expect(paths.filter((p) => p === 'notes/gc.md')).toHaveLength(1)
  })
})
