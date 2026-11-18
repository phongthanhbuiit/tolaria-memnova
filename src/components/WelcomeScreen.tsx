import { CircleNotch as Loader2, FolderOpen, Plus, Rocket, Warning as AlertTriangle } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { OnboardingShell } from './OnboardingShell'
import { Button } from '@/components/ui/button'
import tolariaIcon from '@/assets/tolaria-icon.svg'
import { translate, type AppLocale } from '../lib/i18n'

interface WelcomeScreenProps {
  locale?: AppLocale
  mode: 'welcome' | 'vault-missing'
  missingPath?: string
  defaultVaultPath: string
  onCreateVault: () => void
  onRetryCreateVault: () => void
  onCreateEmptyVault: () => void
  onOpenFolder: () => void
  isOffline: boolean
  creatingAction: 'template' | 'empty' | null
  error: string | null
  canRetryTemplate: boolean
}

interface WelcomeScreenPresentation {
  heroBackground: string
  heroIcon: ReactNode
  openFolderLabel: string
  subtitle: string
  templateDescription: string
  title: string
}

type WelcomeActionButtonRef = React.RefObject<HTMLButtonElement | null>

interface WelcomeAction {
  disabled: boolean
  run: () => void
}

function isWelcomeActivationKey(event: globalThis.KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' '
}

function isWelcomeNavigationKey(event: globalThis.KeyboardEvent): boolean {
  return event.key === 'Tab' || event.key === 'ArrowDown' || event.key === 'ArrowUp'
}

function nextWelcomeActionIndex(
  currentIndex: number,
  event: globalThis.KeyboardEvent,
  actionCount: number,
): number {
  const direction = event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey) ? -1 : 1
  return (currentIndex + direction + actionCount) % actionCount
}

function focusBelongsToWelcomeActions(
  activeElement: Element | null,
  actionButtonRefs: WelcomeActionButtonRef[],
): boolean {
  return activeElement === document.body
    || actionButtonRefs.some(({ current }) => current === activeElement)
}

function getFocusedWelcomeActionIndex(
  activeElement: Element | null,
  actionButtonRefs: WelcomeActionButtonRef[],
): number {
  return Math.max(
    0,
    actionButtonRefs.findIndex(({ current }) => current === activeElement),
  )
}

function focusWelcomeAction(
  actionButtonRefs: WelcomeActionButtonRef[],
  actionIndex: number,
): void {
  actionButtonRefs.at(actionIndex)?.current?.focus()
}

function triggerWelcomeAction(
  actionIndex: number,
  actions: WelcomeAction[],
): void {
  const action = actions.at(actionIndex)
  if (action && !action.disabled) action.run()
}

const CARD_STYLE: React.CSSProperties = {
  width: 'min(520px, 100%)',
  background: 'var(--background)',
  borderRadius: 12,
  border: '1px solid var(--border)',
  padding: 48,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 24,
}

const BRAND_ICON_STYLE: React.CSSProperties = {
  width: 64,
  height: 64,
  display: 'block',
}

const TITLE_STYLE: React.CSSProperties = {
  fontWeight: 600,
  letterSpacing: -0.5,
  color: 'var(--foreground)',
  textAlign: 'center',
  margin: 0,
}

const DIVIDER_STYLE: React.CSSProperties = {
  width: '100%',
  height: 1,
  background: 'var(--border)',
}

const OPTION_LABEL_STYLE: React.CSSProperties = {
  fontWeight: 600,
  color: 'var(--foreground)',
  margin: 0,
}

const OPTION_DESC_STYLE: React.CSSProperties = {
  color: 'var(--muted-foreground)',
  margin: 0,
  marginTop: 2,
}

const ERROR_STYLE: React.CSSProperties = {
  color: 'var(--destructive)',
  textAlign: 'center',
  margin: 0,
}

const STATUS_STYLE: React.CSSProperties = {
  color: 'var(--muted-foreground)',
  textAlign: 'center',
  margin: 0,
}

const ERROR_BLOCK_STYLE: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
}

const RETRY_BUTTON_STYLE: React.CSSProperties = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--background)',
  color: 'var(--foreground)',
  cursor: 'pointer',
  padding: '8px 12px',
  fontWeight: 600,
}

interface OptionButtonProps {
  icon: React.ReactNode
  iconBg: string
  label: string
  description: string
  loadingLabel?: string
  loadingDescription?: string
  onClick: () => void
  disabled: boolean
  loading?: boolean
  testId: string
  autoFocus?: boolean
  buttonRef?: React.RefObject<HTMLButtonElement | null>
}

function OptionButton({
  icon,
  iconBg,
  label,
  description,
  loadingLabel,
  loadingDescription,
  onClick,
  disabled,
  loading,
  testId,
  autoFocus = false,
  buttonRef,
}: OptionButtonProps) {
  const [hover, setHover] = useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      layout="responsive"
      style={{
        background: hover ? 'var(--sidebar)' : 'var(--background)',
        opacity: disabled ? 0.7 : 1,
      }}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-testid={testId}
      autoFocus={autoFocus}
      className="flex h-auto w-full cursor-pointer items-center justify-start gap-[14px] rounded-[8px] border border-solid border-border px-[16px] py-[14px] text-left shadow-none [transition:background_0.15s] dark:border-border"
      ref={buttonRef}
    >
      <div className="flex size-[36px] shrink-0 items-center justify-center rounded-[8px]" style={{ background: iconBg }}>
        {loading ? <Loader2 size={18} className="animate-spin text-muted-foreground" /> : icon}
      </div>
      <div className="min-w-0 [overflow-wrap:break-word]">
        <p className="text-(length:--text-body-lg) leading-(--text-body-lg--line-height)" style={OPTION_LABEL_STYLE}>{loading ? (loadingLabel ?? label) : label}</p>
        <p className="text-(length:--text-small) leading-(--text-small--line-height)" style={OPTION_DESC_STYLE}>{loading ? (loadingDescription ?? description) : description}</p>
      </div>
    </Button>
  )
}

function getWelcomeScreenPresentation(mode: WelcomeScreenProps['mode'], locale: AppLocale): WelcomeScreenPresentation {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  return {
    heroBackground: mode === 'welcome' ? 'transparent' : 'var(--accent-yellow-light)',
    heroIcon: mode === 'welcome' ? <img src={tolariaIcon} alt="" style={BRAND_ICON_STYLE} /> : <AlertTriangle size={28} className="text-(--accent-orange)" />,
    openFolderLabel: t('welcome.open'),
    subtitle: t(mode === 'welcome' ? 'welcome.subtitle' : 'welcome.missingHelp'),
    templateDescription: t('welcome.templateHelp'),
    title: t(mode === 'welcome' ? 'welcome.title' : 'welcome.missing'),
  }
}

function useWelcomeActionButtons({
  mode,
  advanced,
  onToggleAdvanced,
  busy,
  isOffline,
  onCreateEmptyVault,
  onOpenFolder,
  onCreateVault,
  onRetryCreateVault,
  canRetryTemplate,
}: Pick<
  WelcomeScreenProps,
  'mode' | 'isOffline' | 'onCreateEmptyVault' | 'onOpenFolder' | 'onCreateVault' | 'onRetryCreateVault' | 'canRetryTemplate'
> & {
  busy: boolean
  advanced: boolean
  onToggleAdvanced: () => void
}) {
  const advancedActionRef = useRef<HTMLButtonElement>(null)
  const templateActionRef = useRef<HTMLButtonElement>(null)
  const createEmptyActionRef = useRef<HTMLButtonElement>(null)
  const openFolderActionRef = useRef<HTMLButtonElement>(null)
  const retryActionRef = useRef<HTMLButtonElement>(null)
  const actionButtonRefs = useMemo(
    () => [createEmptyActionRef, openFolderActionRef, advancedActionRef, ...(advanced && !isOffline ? [templateActionRef] : []), ...(canRetryTemplate ? [retryActionRef] : [])],
    [advanced, canRetryTemplate, isOffline],
  )
  const actions = useMemo<WelcomeAction[]>(
    () => ([
      { disabled: false, run: onCreateEmptyVault },
      { disabled: false, run: onOpenFolder },
      { disabled: false, run: onToggleAdvanced },
      ...(advanced && !isOffline ? [{ disabled: false, run: onCreateVault }] : []),
      ...(canRetryTemplate ? [{ disabled: false, run: onRetryCreateVault }] : []),
    ]),
    [advanced, canRetryTemplate, isOffline, onCreateEmptyVault, onCreateVault, onOpenFolder, onRetryCreateVault, onToggleAdvanced],
  )

  useEffect(() => {
    void mode
    if (busy || document.activeElement === advancedActionRef.current) return

    // WKWebView can ignore `autoFocus`; move focus explicitly so keyboard-only
    // onboarding always starts on the local Library flow.
    focusWelcomeAction(actionButtonRefs, 0)
  }, [actionButtonRefs, busy, mode])

  useEffect(() => {
    if (busy) return

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const activeElement = document.activeElement
      if (!focusBelongsToWelcomeActions(activeElement, actionButtonRefs)) return

      const actionIndex = getFocusedWelcomeActionIndex(activeElement, actionButtonRefs)
      if (isWelcomeNavigationKey(event)) {
        event.preventDefault()
        focusWelcomeAction(
          actionButtonRefs,
          nextWelcomeActionIndex(actionIndex, event, actionButtonRefs.length),
        )
        return
      }

      if (!isWelcomeActivationKey(event)) return

      event.preventDefault()
      triggerWelcomeAction(actionIndex, actions)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [actionButtonRefs, actions, busy])

  return { advancedActionRef, templateActionRef, createEmptyActionRef, openFolderActionRef, retryActionRef }
}

export function WelcomeScreen({
  mode,
  locale = 'en',
  onCreateVault,
  onRetryCreateVault,
  onCreateEmptyVault,
  onOpenFolder,
  isOffline,
  creatingAction,
  error,
  canRetryTemplate,
}: WelcomeScreenProps) {
  const [advanced, setAdvanced] = useState(creatingAction === 'template')
  const onToggleAdvanced = useCallback(() => setAdvanced(value => !value), [])
  const busy = creatingAction !== null
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
  const presentation = getWelcomeScreenPresentation(mode, locale)
  const { advancedActionRef, templateActionRef, createEmptyActionRef, openFolderActionRef, retryActionRef } = useWelcomeActionButtons({
    mode,
    advanced,
    onToggleAdvanced,
    busy,
    isOffline,
    onCreateEmptyVault,
    onOpenFolder,
    onCreateVault,
    onRetryCreateVault,
    canRetryTemplate: Boolean(error && canRetryTemplate),
  })

  return (
    <OnboardingShell
      className="items-start overflow-y-auto bg-sidebar"
      contentClassName="my-auto"
      contentStyle={CARD_STYLE}
      testId="welcome-screen"
    >
      <>
        <div
          className="flex size-[64px] items-center justify-center rounded-[16px]"
          style={{ background: presentation.heroBackground }}
        >
          {presentation.heroIcon}
        </div>

        <div className="text-center">
          <h1 className="text-(length:--text-display) leading-(--text-display--line-height)" style={TITLE_STYLE}>{presentation.title}</h1>
          <p className="m-0 mt-[8px] text-center text-muted-foreground text-(length:--text-body-lg) leading-(--text-body-lg--line-height)">
            {presentation.subtitle}
          </p>
        </div>

        <div style={DIVIDER_STYLE} />

        <div className="flex w-full flex-col gap-[10px]">


          <OptionButton
            icon={<Plus size={18} className="text-(--accent-blue)" />}
            iconBg="var(--accent-blue-light)"
            label={t('welcome.create')}
            description={t('welcome.createHelp')}
            loadingLabel={t('welcome.creating')}
            loadingDescription={t('welcome.createHelp')}
            onClick={onCreateEmptyVault}
            disabled={busy}
            loading={creatingAction === 'empty'}
            testId="welcome-create-new"
            autoFocus
            buttonRef={createEmptyActionRef}
          />

          <OptionButton
            icon={<FolderOpen size={18} className="text-(--accent-green)" />}
            iconBg="var(--accent-green-light)"
            label={presentation.openFolderLabel}
            description={t('welcome.openHelp')}
            onClick={onOpenFolder}
            disabled={busy}
            testId="welcome-open-folder"
            buttonRef={openFolderActionRef}
          />
          <Button ref={advancedActionRef} variant="ghost" disabled={busy} aria-expanded={advanced} onClick={onToggleAdvanced}>{t('learning.advanced')}</Button>
          {advanced && <>          <OptionButton
            icon={<Rocket size={18} className="text-(--accent-purple)" />}
            iconBg="var(--accent-purple-light)"
            label={t('welcome.template')}
            description={presentation.templateDescription}
            loadingLabel={t('welcome.downloading')}
            loadingDescription={t('welcome.templateHelp')}
            onClick={onCreateVault}
            disabled={busy || isOffline}
            loading={creatingAction === 'template'}
            testId="welcome-create-vault"
            buttonRef={templateActionRef}
          /></>}

        </div>

        {creatingAction === 'template' && (
          <p className="text-(length:--text-body) leading-(--text-body--line-height)" style={STATUS_STYLE} data-testid="welcome-status" role="status" aria-live="polite">
            {t('welcome.downloading')}
          </p>
        )}

        {error && (
          <div style={ERROR_BLOCK_STYLE}>
            <p className="text-(length:--text-body) leading-(--text-body--line-height)" style={ERROR_STYLE} data-testid="welcome-error" role="alert" aria-live="assertive">
              {error}
            </p>
            {canRetryTemplate && (
              <Button
                ref={retryActionRef}
                type="button"
                variant="outline"
                style={RETRY_BUTTON_STYLE}
                onClick={onRetryCreateVault}
                data-testid="welcome-retry-template"
                className="shadow-none text-(length:--text-body) leading-(--text-body--line-height)"
              >
                {t('learning.retry')}
              </Button>
            )}
          </div>
        )}
      </>
    </OnboardingShell>
  )
}
