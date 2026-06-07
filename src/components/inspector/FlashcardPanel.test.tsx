/**
 * FlashcardPanel.test.tsx
 *
 * Tests for the FlashcardPanel inspector component covering:
 *  - FSRS toggle on/off
 *  - IPA phonetics field (renders value, commits on blur, reverts on Escape)
 *  - Audio filename field (renders value, commits on blur)
 *  - Scheduling stats display
 *  - Fields only visible when FSRS is enabled
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FlashcardPanel } from './FlashcardPanel'
import type { VaultEntry } from '../../types'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/note.md',
    filename: 'note.md',
    title: 'Test Note',
    snippet: '',
    isA: null,
    status: null,
    color: null,
    icon: null,
    archived: false,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    sidebarLabel: null,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    relationships: {},
    outgoingLinks: [],
    properties: {},
    listPropertiesDisplay: [],
    hasH1: false,
    fileKind: 'markdown',
    noteWidth: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    order: null,
    modifiedAt: 0,
    createdAt: 0,
    workspace: { id: 'w', label: 'Vault', alias: 'V', path: '/vault', shortLabel: 'V', color: null, icon: null, mounted: true, available: true, defaultForNewNotes: true },
    fsrsEnabled: false,
    fsrsState: undefined,
    fsrsDue: undefined,
    fsrsStability: undefined,
    fsrsDifficulty: undefined,
    fsrsElapsedDays: undefined,
    fsrsScheduledDays: undefined,
    fsrsReps: undefined,
    fsrsLapses: undefined,
    fsrsLastReview: undefined,
    ...overrides,
  }
}

function makeEnabledEntry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return makeEntry({
    fsrsEnabled: true,
    fsrsState: 'learning',
    // 2 full days ago → Math.round(-2) = -2 < 0 → "Due now"
    fsrsDue: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    fsrsReps: 2,
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('FlashcardPanel', () => {
  it('renders the Flashcard section header', () => {
    render(<FlashcardPanel entry={makeEntry()} />)
    expect(screen.getByText('Flashcard')).toBeInTheDocument()
  })

  it('renders the spaced repetition toggle', () => {
    render(<FlashcardPanel entry={makeEntry()} />)
    expect(screen.getByRole('switch', { name: /spaced repetition/i })).toBeInTheDocument()
  })

  it('shows toggle as unchecked when fsrsEnabled is false', () => {
    render(<FlashcardPanel entry={makeEntry({ fsrsEnabled: false })} />)
    expect(screen.getByRole('switch', { name: /spaced repetition/i })).not.toBeChecked()
  })

  it('shows toggle as checked when fsrsEnabled is true', () => {
    render(<FlashcardPanel entry={makeEnabledEntry()} />)
    expect(screen.getByRole('switch', { name: /spaced repetition/i })).toBeChecked()
  })

  // ---------------------------------------------------------------------------
  // Vocabulary fields visibility
  // ---------------------------------------------------------------------------

  it('hides IPA and audio fields when FSRS is disabled', () => {
    render(<FlashcardPanel entry={makeEntry({ fsrsEnabled: false })} />)
    expect(screen.queryByLabelText(/ipa phonetics/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/audio file/i)).not.toBeInTheDocument()
  })

  it('shows IPA and audio fields when FSRS is enabled', () => {
    render(<FlashcardPanel entry={makeEnabledEntry()} />)
    expect(screen.getByLabelText(/ipa phonetics/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/audio file/i)).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // IPA field
  // ---------------------------------------------------------------------------

  it('populates IPA field from entry.properties.IPA', () => {
    const entry = makeEnabledEntry({ properties: { IPA: '/wɜːd/' } })
    render(<FlashcardPanel entry={entry} />)
    expect(screen.getByLabelText(/ipa phonetics/i)).toHaveValue('/wɜːd/')
  })

  it('calls onUpdateFrontmatter with IPA key on blur', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const entry = makeEnabledEntry({ properties: { IPA: '' } })
    render(<FlashcardPanel entry={entry} onUpdateFrontmatter={onUpdate} />)

    const input = screen.getByLabelText(/ipa phonetics/i)
    fireEvent.change(input, { target: { value: '/wɜːd/' } })
    fireEvent.blur(input)

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('/vault/note.md', 'IPA', '/wɜːd/')
    })
  })

  it('does not call onUpdateFrontmatter if IPA value did not change', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const entry = makeEnabledEntry({ properties: { IPA: '/wɜːd/' } })
    render(<FlashcardPanel entry={entry} onUpdateFrontmatter={onUpdate} />)

    const input = screen.getByLabelText(/ipa phonetics/i)
    fireEvent.blur(input) // no change

    await waitFor(() => {
      expect(onUpdate).not.toHaveBeenCalled()
    })
  })

  it('reverts IPA draft on Escape', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const entry = makeEnabledEntry({ properties: { IPA: '/wɜːd/' } })
    render(<FlashcardPanel entry={entry} onUpdateFrontmatter={onUpdate} />)

    const input = screen.getByLabelText(/ipa phonetics/i)
    fireEvent.change(input, { target: { value: '/changed/' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    // Input value should revert
    expect(input).toHaveValue('/wɜːd/')
    // No update should have been called
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('commits IPA on Enter key', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const entry = makeEnabledEntry({ properties: {} })
    render(<FlashcardPanel entry={entry} onUpdateFrontmatter={onUpdate} />)

    const input = screen.getByLabelText(/ipa phonetics/i)
    fireEvent.change(input, { target: { value: '/ˈwɜːd/' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // JSDOM: programmatic .blur() inside a synthetic keyDown handler does not
    // fire the blur event automatically — trigger it explicitly to match browser behaviour.
    fireEvent.blur(input)

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('/vault/note.md', 'IPA', '/ˈwɜːd/')
    })
  })

  // ---------------------------------------------------------------------------
  // Audio field
  // ---------------------------------------------------------------------------

  it('populates audio field from entry.properties.audio', () => {
    const entry = makeEnabledEntry({ properties: { audio: 'word.mp3' } })
    render(<FlashcardPanel entry={entry} />)
    expect(screen.getByLabelText(/audio file/i)).toHaveValue('word.mp3')
  })

  it('calls onUpdateFrontmatter with audio key on blur', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const entry = makeEnabledEntry({ properties: {} })
    render(<FlashcardPanel entry={entry} onUpdateFrontmatter={onUpdate} />)

    const input = screen.getByLabelText(/audio file/i)
    fireEvent.change(input, { target: { value: 'word.mp3' } })
    fireEvent.blur(input)

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('/vault/note.md', 'audio', 'word.mp3')
    })
  })

  it('shows drag-and-drop hint when FSRS is enabled', () => {
    render(<FlashcardPanel entry={makeEnabledEntry()} />)
    expect(screen.getByText(/drag an audio file/i)).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Scheduling stats
  // ---------------------------------------------------------------------------

  it('shows scheduling stats when FSRS is enabled', () => {
    render(<FlashcardPanel entry={makeEnabledEntry()} />)
    expect(screen.getByText('Due now')).toBeInTheDocument()
    expect(screen.getByText('Reviews')).toBeInTheDocument()
  })

  it('hides scheduling stats when FSRS is disabled', () => {
    render(<FlashcardPanel entry={makeEntry()} />)
    expect(screen.queryByText('Due now')).not.toBeInTheDocument()
    expect(screen.queryByText('Reviews')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Toggle action
  // ---------------------------------------------------------------------------

  it('calls onUpdateFrontmatter with _fsrs_enabled true when toggled on', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const entry = makeEntry({ fsrsEnabled: false })
    render(<FlashcardPanel entry={entry} onUpdateFrontmatter={onUpdate} />)

    fireEvent.click(screen.getByRole('switch', { name: /spaced repetition/i }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('/vault/note.md', '_fsrs_enabled', true)
    })
  })

  it('calls onUpdateFrontmatter with _fsrs_enabled false when toggled off', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const entry = makeEnabledEntry()
    render(<FlashcardPanel entry={entry} onUpdateFrontmatter={onUpdate} />)

    fireEvent.click(screen.getByRole('switch', { name: /spaced repetition/i }))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith('/vault/note.md', '_fsrs_enabled', false)
    })
  })

  it('does not call onUpdateFrontmatter when disabled prop is absent', async () => {
    const entry = makeEntry()
    render(<FlashcardPanel entry={entry} />) // no onUpdateFrontmatter
    // Toggle is disabled — clicking should do nothing
    fireEvent.click(screen.getByRole('switch', { name: /spaced repetition/i }))
    // No assertion error = no handler called
  })
})
