import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlashcardStudyView } from './FlashcardStudyView'
import type { VaultEntry } from '../types'

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((cmd) => {
    if (cmd === 'get_note_content') {
      return Promise.resolve('# Front Content\n\n<!-- FLASHCARD:BACK -->\n\n# Back Content')
    }
    return Promise.resolve('')
  }),
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${encodeURIComponent(path)}`),
}))

// Mock BlockNote
vi.mock('@blocknote/core', () => ({
  audioParse: vi.fn(() => undefined), createAudioBlockConfig: vi.fn(() => ({})),
  BlockNoteSchema: { create: () => ({ extend: () => ({}) }) },
  createCodeBlockSpec: vi.fn(() => ({})),
  createExtension: (factory: unknown) => () => factory,
  createVideoBlockConfig: vi.fn(() => ({})), defaultInlineContentSpecs: {},
  filterSuggestionItems: vi.fn(() => []), videoParse: vi.fn(() => undefined),
}))

vi.mock('@blocknote/code-block', () => ({ codeBlockOptions: {} }))

vi.mock('@blocknote/react', () => ({
  createReactBlockSpec: () => () => ({}),
  createReactInlineContentSpec: () => ({ render: () => null }),
  BlockNoteViewRaw: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="blocknote-view-raw">{children}</div>
  ),
  ComponentsContext: {
    Provider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  },
  useCreateBlockNote: () => ({
    tryParseMarkdownToBlocks: async () => [],
    replaceBlocks: () => {},
    document: [],
    onMount: (cb: () => void) => { cb(); return () => {} },
  }),
}))

vi.mock('@blocknote/mantine', () => ({
  components: {},
}))

vi.mock('@mantine/core', () => ({
  MantineProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))

// Mock audio
vi.mock('../utils/flashcardAudio', () => ({
  resolveFlashcardAudioUrl: () => 'asset://localhost/audio.mp3',
}))

describe('FlashcardStudyView', () => {
  const mockEntries: VaultEntry[] = [
    {
      path: '/vault/vocab.md',
      filename: 'vocab.md',
      title: 'Vocabulary Word',
      isA: 'Vocabulary',
      aliases: [],
      belongsTo: [],
      relatedTo: [],
      modifiedAt: 1700000000,
      createdAt: null,
      fileSize: 1024,
      snippet: '# Front Content\n\n<!-- FLASHCARD:BACK -->\n\n# Back Content',
      wordCount: 10,
      relationships: {},
      icon: null,
      color: null,
      order: null,
      sidebarLabel: null,
      template: null,
      sort: null,
      view: null,
      visible: true,
      organized: false,
      favorite: false,
      favoriteIndex: null,
      listPropertiesDisplay: [],
      outgoingLinks: [],
      properties: {
        card_type: 'vocabulary',
        part_of_speech: 'noun',
        level: 'B2',
        image: 'attachments/illustration.png',
        synonyms: '[[WordA]]',
        antonyms: '[[WordB]]',
        prefixes: '[[WordC]]',
        suffixes: '[[WordD]]',
      },
      hasH1: true,
      fileKind: 'markdown',
      workspace: {
        path: '/vault',
      },
    } as unknown as VaultEntry,
  ]

  const playSpy = vi.fn().mockResolvedValue(undefined)
  const pauseSpy = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock global Audio
    globalThis.Audio = vi.fn().mockImplementation(function() {
      return {
        play: playSpy,
        pause: pauseSpy,
        paused: true,
        src: '',
      }
    }) as unknown as typeof Audio
  })

  it('renders front face with vocabulary badges (part_of_speech & level)', async () => {
    await act(async () => {
      render(
        <FlashcardStudyView
          entries={mockEntries}
          onRate={vi.fn()}
          onClose={vi.fn()}
        />
      )
    })

    // Check front face is rendered
    expect(screen.getByText('noun')).toBeInTheDocument()
    expect(screen.getByText('B2')).toBeInTheDocument()
    expect(screen.getByText('Show answer')).toBeInTheDocument()
  })

  it('reveals back face and shows image & relations', async () => {
    const onNavigate = vi.fn()
    await act(async () => {
      render(
        <FlashcardStudyView
          entries={mockEntries}
          onRate={vi.fn()}
          onClose={vi.fn()}
          onNavigate={onNavigate}
        />
      )
    })

    // Flip the card
    await act(async () => {
      fireEvent.click(screen.getByTestId('flashcard-show-answer'))
    })

    // Verify audio auto-played
    expect(globalThis.Audio).toHaveBeenCalled()
    expect(playSpy).toHaveBeenCalled()

    // Image illustration should render
    const image = await screen.findByAltText('Vocabulary illustration')
    expect(image).toBeInTheDocument()
    expect(image.getAttribute('src')).toContain('illustration.png')

    // Relations should be rendered
    expect(screen.getByText('Từ vựng liên quan')).toBeInTheDocument()
    expect(screen.getByText('[[WordA]]')).toBeInTheDocument()
    expect(screen.getByText('[[WordB]]')).toBeInTheDocument()
    expect(screen.getByText('[[WordC]]')).toBeInTheDocument()
    expect(screen.getByText('[[WordD]]')).toBeInTheDocument()

    // Click on [[WordA]] wikilink should trigger navigation
    await act(async () => {
      fireEvent.click(screen.getByText('[[WordA]]'))
    })
    expect(onNavigate).toHaveBeenCalledWith('WordA')
  })

  it('opens lightbox when image is clicked and supports zoom operations', async () => {
    await act(async () => {
      render(
        <FlashcardStudyView
          entries={mockEntries}
          onRate={vi.fn()}
          onClose={vi.fn()}
        />
      )
    })

    // Flip the card
    await act(async () => {
      fireEvent.click(screen.getByTestId('flashcard-show-answer'))
    })

    // Click on image to open lightbox
    const image = await screen.findByAltText('Vocabulary illustration')
    await act(async () => {
      fireEvent.click(image)
    })

    // Lightbox should open
    expect(screen.getByText('Memory Palace Viewfinder')).toBeInTheDocument()
    const zoomImg = screen.getByAltText('Zoomed memory palace')
    expect(zoomImg).toBeInTheDocument()

    // Zoom buttons
    const zoomInBtn = screen.getByText('Zoom In')
    const zoomOutBtn = screen.getByText('Zoom Out')
    const resetBtn = screen.getByText('100%')

    await act(async () => {
      fireEvent.click(zoomInBtn)
    })
    expect(screen.getByText('125%')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(zoomOutBtn)
    })
    expect(screen.getByText('100%')).toBeInTheDocument()

    // Reset button
    await act(async () => {
      fireEvent.click(zoomInBtn)
    })
    await act(async () => {
      fireEvent.click(zoomInBtn)
    })
    expect(screen.getByText('150%')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(resetBtn)
    })
    expect(screen.getByText('100%')).toBeInTheDocument()

    // Close lightbox
    const closeBtn = screen.getByRole('button', { name: 'Close' })
    await act(async () => {
      fireEvent.click(closeBtn)
    })
    expect(screen.queryByText('Memory Palace Viewfinder')).not.toBeInTheDocument()
  })
})
