import { GearSix, X, Sparkle, WarningCircle, PencilSimple } from '@phosphor-icons/react'
import { ActionTooltip } from '@/components/ui/action-tooltip'
import { Button } from '@/components/ui/button'
import { useDragRegion } from '../../hooks/useDragRegion'
import { translate, type AppLocale } from '../../lib/i18n'
import { hasFrontmatterWarnings, type FrontmatterWarnings } from '../../utils/frontmatter'

function FrontmatterWarningsButton({ locale, onOpenRawEditor }: { locale: AppLocale; onOpenRawEditor: () => void }) {
  const label = translate(locale, 'inspector.title.collidingPropertiesAria')
  return (
    <ActionTooltip copy={{ label }} side="bottom">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 rounded-md border border-[var(--feedback-warning-border)] bg-[var(--feedback-warning-bg)] p-0 text-[var(--feedback-warning-text)] shadow-none hover:brightness-95"
        aria-label={label}
        data-testid="frontmatter-warnings-button"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={onOpenRawEditor}
      >
        <WarningCircle size={16} weight="fill" aria-hidden="true" />
      </Button>
    </ActionTooltip>
  )
}

export function InspectorHeader({ collapsed, frontmatterWarnings, locale = 'en', onToggle, onOpenRawEditor }: {
  collapsed: boolean
  frontmatterWarnings?: FrontmatterWarnings
  locale?: AppLocale
  onToggle: () => void
  onOpenRawEditor?: () => void
}) {
  const { dragRegionRef } = useDragRegion<HTMLDivElement>()
  const propertiesTitle = translate(locale, 'inspector.title.properties')
  const showWarnings = Boolean(frontmatterWarnings && hasFrontmatterWarnings(frontmatterWarnings) && onOpenRawEditor)
  const propertiesIcon = (testId?: string) => (
    <GearSix
      size={16}
      weight="regular"
      className="shrink-0 text-text-secondary"
      data-testid={testId}
    />
  )
  const toggleLabel = translate(locale, collapsed ? 'inspector.title.propertiesShortcut' : 'inspector.title.closePropertiesShortcut')

  return (
    <div
      ref={dragRegionRef}
      className={`flex min-h-[calc(var(--control-sm)*2)] shrink-0 cursor-default items-center gap-2 border-b border-border py-2 ${collapsed ? 'justify-center px-0' : 'px-4'}`}
    >
      {collapsed ? (
        <Button variant="ghost" size="icon-sm" type="button"
          className="shrink-0 border-none bg-transparent p-1 text-text-secondary cursor-pointer hover:text-foreground"
          onClick={onToggle}
          title={toggleLabel}
          aria-label={toggleLabel}
        >
          {propertiesIcon('properties-panel-icon')}
        </Button>
      ) : (
        <>
          {propertiesIcon('properties-panel-icon')}
          <span className="min-w-0 truncate text-title text-foreground">{propertiesTitle}</span>
          {showWarnings && onOpenRawEditor && (
            <FrontmatterWarningsButton locale={locale} onOpenRawEditor={onOpenRawEditor} />
          )}
          <span className="flex-1" />
          <Button variant="ghost" size="icon-sm" type="button"
            className="shrink-0 border-none bg-transparent p-1 text-text-secondary cursor-pointer hover:text-foreground"
            onClick={onToggle}
            title={toggleLabel}
            aria-label={toggleLabel}
          >
            <X size={16} />
          </Button>
        </>
      )}
    </div>
  )
}

export function EmptyInspector({ locale = 'en' }: { locale?: AppLocale }) {
  return <div><p className="m-0 text-body text-text-secondary">{translate(locale, 'inspector.empty.noNoteSelected')}</p></div>
}

export function InitializePropertiesPrompt({ locale = 'en', onClick }: { locale?: AppLocale; onClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6">
      <Sparkle size={24} className="text-text-secondary" />
      <p className="m-0 text-center text-body text-text-secondary">{translate(locale, 'inspector.empty.noProperties')}</p>
      <Button variant="ghost" size="sm" type="button"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-0 text-body font-medium text-foreground transition-colors hover:bg-muted"
        onClick={onClick}
      >
        {translate(locale, 'inspector.empty.initializeProperties')}
      </Button>
    </div>
  )
}

export function InvalidFrontmatterNotice({ locale = 'en', onFix }: { locale?: AppLocale; onFix: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-6">
      <WarningCircle size={24} className="text-destructive" />
      <p className="m-0 text-center text-body text-text-secondary">{translate(locale, 'inspector.empty.invalidProperties')}</p>
      <Button variant="ghost" size="sm" type="button"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-0 text-body font-medium text-foreground transition-colors hover:bg-muted"
        onClick={onFix}
      >
        <PencilSimple size={16} />
        {translate(locale, 'inspector.empty.fixInEditor')}
      </Button>
    </div>
  )
}
