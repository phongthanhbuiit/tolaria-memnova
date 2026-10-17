import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { WelcomeScreen } from './WelcomeScreen'
import tolariaIcon from '@/assets/tolaria-icon.svg'

const dragRegionMouseDown = vi.fn()

vi.mock('../hooks/useDragRegion', () => ({
  useDragRegion: () => ({ onMouseDown: dragRegionMouseDown }),
}))

function renderWelcome(ui: React.ReactElement) {
  const result = render(ui)
  const advanced = screen.getByRole('button', { name: 'Advanced', exact: true })
  if (advanced.getAttribute('aria-expanded') !== 'true' && !advanced.hasAttribute('disabled')) fireEvent.click(advanced)
  return result
}

const defaultProps = {
  mode: 'welcome' as const,
  defaultVaultPath: '~/Documents/Laputa',
  onCreateVault: vi.fn(),
  onRetryCreateVault: vi.fn(),
  onCreateEmptyVault: vi.fn(),
  onOpenFolder: vi.fn(),
  isOffline: false,
  creatingAction: null as 'template' | 'empty' | null,
  error: null,
  canRetryTemplate: false,
}

describe('WelcomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('welcome mode', () => {
    it('renders welcome title and subtitle', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText('Welcome to Memnova')).toBeInTheDocument()
      expect(screen.getByText('Turn your pages into lasting knowledge.')).toBeInTheDocument()
    })

    it('renders the local Tolaria branding icon', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} />)

      const brandIcon = screen.getByAltText('')
      expect(brandIcon).toHaveAttribute('src', tolariaIcon)
    })

    it('shows the onboarding actions in the guided-first order', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} />)

      const optionButtons = screen.getAllByRole('button')
      expect(optionButtons[0]).toBe(screen.getByTestId('welcome-create-new'))
      expect(optionButtons[1]).toBe(screen.getByTestId('welcome-open-folder'))
      expect(optionButtons[3]).toBe(screen.getByTestId('welcome-create-vault'))
    })

    it('focuses the first action for keyboard users', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByTestId('welcome-create-new')).toHaveFocus()
    })

    it('shows the simplified template option description', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByText('Optional Tolaria template. Requires internet.')).toBeInTheDocument()
      expect(screen.queryByText(/~\/Documents\/Laputa/)).not.toBeInTheDocument()
    })

    it('shows offline guidance and disables the template option when offline', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} isOffline={true} />)
      expect(screen.getByTestId('welcome-create-vault')).toBeDisabled()
      expect(screen.getByText(/Requires internet/)).toBeInTheDocument()
    })

    it('calls onCreateEmptyVault when create empty button is clicked', () => {
      const onCreateEmptyVault = vi.fn()
      renderWelcome(<WelcomeScreen {...defaultProps} onCreateEmptyVault={onCreateEmptyVault} />)
      fireEvent.click(screen.getByTestId('welcome-create-new'))
      expect(onCreateEmptyVault).toHaveBeenCalledOnce()
    })

    it('calls onCreateEmptyVault when create empty button is activated with Enter', () => {
      const onCreateEmptyVault = vi.fn()
      renderWelcome(<WelcomeScreen {...defaultProps} onCreateEmptyVault={onCreateEmptyVault} />)
      const button = screen.getByTestId('welcome-create-new')

      button.focus()
      fireEvent.keyDown(button, { key: 'Enter' })

      expect(onCreateEmptyVault).toHaveBeenCalledOnce()
    })

    it('calls onCreateEmptyVault when create empty button is activated with Space', () => {
      const onCreateEmptyVault = vi.fn()
      renderWelcome(<WelcomeScreen {...defaultProps} onCreateEmptyVault={onCreateEmptyVault} />)
      const button = screen.getByTestId('welcome-create-new')

      button.focus()
      fireEvent.keyDown(button, { key: ' ' })

      expect(onCreateEmptyVault).toHaveBeenCalledOnce()
    })

    it('calls onCreateVault when template button is clicked', () => {
      const onCreateVault = vi.fn()
      renderWelcome(<WelcomeScreen {...defaultProps} onCreateVault={onCreateVault} />)
      fireEvent.click(screen.getByTestId('welcome-create-vault'))
      expect(onCreateVault).toHaveBeenCalledOnce()
    })

    it('calls onOpenFolder when open folder button is clicked', () => {
      const onOpenFolder = vi.fn()
      renderWelcome(<WelcomeScreen {...defaultProps} onOpenFolder={onOpenFolder} />)
      fireEvent.click(screen.getByTestId('welcome-open-folder'))
      expect(onOpenFolder).toHaveBeenCalledOnce()
    })

    it('cycles onboarding actions with Tab and activates the selected action with Enter', () => {
      const onOpenFolder = vi.fn()
      renderWelcome(<WelcomeScreen {...defaultProps} onOpenFolder={onOpenFolder} />)

      fireEvent.keyDown(window, { key: 'Tab' })
      fireEvent.keyDown(window, { key: 'Enter' })

      expect(onOpenFolder).toHaveBeenCalledOnce()
    })

    it('disables all buttons while creating', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} creatingAction="template" />)
      expect(screen.getByTestId('welcome-create-new')).toBeDisabled()
      expect(screen.getByTestId('welcome-open-folder')).toBeDisabled()
      expect(screen.getByTestId('welcome-create-vault')).toBeDisabled()
    })

    it('shows loading text on template button while creating', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} creatingAction="template" />)
      expect(screen.getByTestId('welcome-create-vault')).toHaveTextContent(/Downloading template/)
      expect(screen.getByTestId('welcome-status')).toHaveAttribute('aria-live', 'polite')
    })

    it('shows loading text on create-new button while creating an empty vault', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} creatingAction="empty" />)
      expect(screen.getByTestId('welcome-create-new')).toHaveTextContent(/Creating Library/)
    })

    it('shows error message when error is set', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} error="Permission denied" />)
      expect(screen.getByTestId('welcome-error')).toHaveTextContent('Permission denied')
      expect(screen.getByTestId('welcome-error')).toHaveAttribute('aria-live', 'assertive')
    })

    it('does not show error when error is null', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} />)
      expect(screen.queryByTestId('welcome-error')).not.toBeInTheDocument()
    })

    it('shows a retry button after template download errors', () => {
      const onRetryCreateVault = vi.fn()
      render(
        <WelcomeScreen
          {...defaultProps}
          error="Could not download Getting Started vault. Check your connection and try again."
          canRetryTemplate={true}
          onRetryCreateVault={onRetryCreateVault}
        />,
      )

      fireEvent.click(screen.getByTestId('welcome-retry-template'))
      expect(onRetryCreateVault).toHaveBeenCalledOnce()
    })

    it('does not show path badge in welcome mode', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} />)
      expect(screen.queryByText('~/Laputa')).not.toBeInTheDocument()
    })
  })

  describe('vault-missing mode', () => {
    const missingProps = {
      ...defaultProps,
      mode: 'vault-missing' as const,
      missingPath: '~/Laputa',
    }

    it('renders vault not found title', () => {
      renderWelcome(<WelcomeScreen {...missingProps} />)
      expect(screen.getByText('Library not found')).toBeInTheDocument()
      expect(screen.getByText(/could not be found on disk/)).toBeInTheDocument()
    })

    it('does not show the missing vault path in a badge', () => {
      renderWelcome(<WelcomeScreen {...missingProps} />)
      expect(screen.queryByText('~/Laputa')).not.toBeInTheDocument()
    })

    it('shows "Open existing Library" instead of "Open existing vault"', () => {
      renderWelcome(<WelcomeScreen {...missingProps} />)
      expect(screen.getByTestId('welcome-open-folder')).toHaveTextContent('Open existing Library')
    })
  })

  describe('data-testid', () => {
    it('has welcome-screen container testid', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} />)
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })

    it('uses the surrounding surface as a drag region and excludes the card', () => {
      renderWelcome(<WelcomeScreen {...defaultProps} />)

      const screenContainer = screen.getByTestId('welcome-screen')
      fireEvent.mouseDown(screenContainer)

      expect(dragRegionMouseDown).toHaveBeenCalledOnce()
      expect(screenContainer.querySelector('[data-no-drag]')).not.toBeNull()
    })
  })
})

it('starts with a local Library and keeps template downloads under Advanced', () => {
  render(<WelcomeScreen {...defaultProps} />)
  expect(screen.getByTestId('welcome-create-new')).toHaveFocus()
  expect(screen.queryByTestId('welcome-create-vault')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Advanced', exact: true }))
  expect(screen.getByTestId('welcome-create-vault')).toBeVisible()
})

it('keeps the Advanced template path reachable by keyboard', () => {
  render(<WelcomeScreen {...defaultProps} />)
  fireEvent.keyDown(window, { key: 'Tab' })
  fireEvent.keyDown(window, { key: 'Tab' })
  expect(screen.getByRole('button', { name: 'Advanced', exact: true })).toHaveFocus()
  fireEvent.keyDown(window, { key: 'Enter' })
  fireEvent.keyDown(window, { key: 'Tab' })
  expect(screen.getByTestId('welcome-create-vault')).toHaveFocus()
})
