import { useEffect, useRef, type ComponentType, type MouseEvent as ReactMouseEvent } from 'react'
import type { SidebarSelection, VaultEntry, WorkspaceIdentity } from '../types'
import { cn } from '@/lib/utils'
import { getTypeColor, getTypeLightColor } from '../utils/typeColors'
import { type IconProps } from '@phosphor-icons/react'
import { SIDEBAR_ITEM_PADDING } from './sidebar/sidebarStyles'
import { useSidebarInlineRenameInput } from './sidebar/sidebarHooks'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Input } from './ui/input'
import { translate, type AppLocale } from '../lib/i18n'
import { WorkspaceInitialsBadge } from './WorkspaceInitialsBadge'
import {
  collectTypeVisibilityWorkspaces,
  findTypeDefinitionForWorkspace,
} from '../utils/typeVisibility'

export interface SectionGroup {
  label: string
  type: string
  Icon: ComponentType<IconProps>
  customColor?: string | null
}

function resolveSectionColors(type: string, customColor?: string | null) {
  return {
    sectionColor: getTypeColor(type, customColor),
    sectionLightColor: getTypeLightColor(type, customColor),
  }
}

// eslint-disable-next-line react-refresh/only-export-components -- utility co-located with component
export function isSelectionActive(current: SidebarSelection, check: SidebarSelection): boolean {
  if (current.kind !== check.kind) return false
  switch (check.kind) {
    case 'filter': return (current as typeof check).filter === check.filter
    case 'sectionGroup': return (current as typeof check).type === check.type
    case 'folder': return (current as typeof check).path === check.path
    case 'entity': return (current as typeof check).entry.path === check.entry.path
    case 'view': {
      const currentView = current as typeof check
      return currentView.filename === check.filename && (currentView.rootPath ?? '') === (check.rootPath ?? '')
    }
    default: return false
  }
}

// --- NavItem ---

function hasSidebarCount(count?: number): count is number {
  return count !== undefined && count > 0
}

function getNavItemPadding(compact: boolean | undefined, hasCount: boolean) {
  if (compact) return hasCount ? SIDEBAR_ITEM_PADDING.compactWithCount : SIDEBAR_ITEM_PADDING.compact
  return hasCount ? SIDEBAR_ITEM_PADDING.withCount : SIDEBAR_ITEM_PADDING.regular
}

function getNavItemIconSize(compact?: boolean) {
  return compact ? 14 : 16
}

function resolveBadgeClassName(
  isActive: boolean | undefined,
  activeBadgeClassName: string | undefined,
  badgeClassName: string | undefined,
) {
  if (isActive && activeBadgeClassName) return activeBadgeClassName
  return badgeClassName
}

function resolveBadgeStyle(
  isActive: boolean | undefined,
  activeBadgeClassName: string | undefined,
  activeBadgeStyle: React.CSSProperties | undefined,
  badgeStyle: React.CSSProperties | undefined,
) {
  if (isActive && activeBadgeClassName) return activeBadgeStyle
  return badgeStyle
}

function SidebarNavIcon({
  Icon,
  emoji,
  iconSize,
  isActive,
}: {
  Icon: ComponentType<IconProps>
  emoji?: string | null
  iconSize: number
  isActive?: boolean
}) {
  if (emoji) return <span className="w-4 shrink-0 text-center text-title">{emoji}</span>
  return <Icon size={iconSize} weight={isActive ? 'fill' : 'regular'} />
}

export function SidebarCountPill({
  count,
  className,
  style,
  testId = 'sidebar-count-chip',
}: {
  count: number
  className?: string
  style?: React.CSSProperties
  compact?: boolean
  testId?: string
}) {
  return (
    <span
      data-testid={testId}
      className={cn("flex items-center justify-center rounded-full text-caption font-medium py-0 px-2 tabular-nums", className)}
      style={style}
    >
      {count}
    </span>
  )
}

export function SidebarLoadingCountPill({ compact, testId = 'sidebar-count-skeleton' }: { compact?: boolean; testId?: string }) {
  return (
    <span
      aria-hidden="true"
      data-testid={testId}
      className={cn("inline-flex h-4 animate-pulse rounded-full bg-muted", compact ? "w-6" : "w-8")}
    />
  )
}

function NavItemLabel({ label }: { label: string; compact?: boolean }) {
  return <span className={cn("min-w-0 flex-1 truncate text-left font-medium", "text-body-lg")}>{label}</span>
}

function NavItemCount({
  count,
  countLoading,
  className,
  style,
  compact,
}: {
  count?: number
  countLoading?: boolean
  className?: string
  style?: React.CSSProperties
  compact?: boolean
}) {
  if (countLoading) return <SidebarLoadingCountPill compact={compact} />
  if (!hasSidebarCount(count)) return null
  return (
    <SidebarCountPill
      count={count}
      className={className}
      style={style}
      compact={compact}
    />
  )
}

function DisabledNavItem({
  Icon,
  emoji,
  label,
  compact,
  disabledTooltip,
  padding,
}: {
  Icon: ComponentType<IconProps>
  emoji?: string | null
  label: string
  compact?: boolean
  disabledTooltip?: string
  padding: ReturnType<typeof getNavItemPadding>
}) {
  return (
    <div className="flex select-none items-center gap-2 rounded-md text-foreground opacity-40 cursor-not-allowed" style={{ padding }} title={disabledTooltip ?? "Coming soon"}>
      <SidebarNavIcon Icon={Icon} emoji={emoji} iconSize={getNavItemIconSize(compact)} />
      <NavItemLabel label={label} compact={compact} />
    </div>
  )
}

function ClickableNavItem({
  Icon,
  emoji,
  label,
  count,
  countLoading,
  isActive,
  activeClassName,
  badgeClassName,
  badgeStyle,
  activeBadgeClassName,
  activeBadgeStyle,
  onClick,
  compact,
  padding,
}: {
  Icon: ComponentType<IconProps>
  emoji?: string | null
  label: string
  count?: number
  countLoading?: boolean
  isActive?: boolean
  activeClassName: string
  badgeClassName?: string
  badgeStyle?: React.CSSProperties
  activeBadgeClassName?: string
  activeBadgeStyle?: React.CSSProperties
  onClick?: () => void
  compact?: boolean
  padding: ReturnType<typeof getNavItemPadding>
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("w-full cursor-pointer select-none justify-start rounded-md text-left transition-colors", isActive ? activeClassName : "text-foreground hover:bg-accent")}
      style={{ padding }}
      onClick={onClick}
    >
      <SidebarNavIcon Icon={Icon} emoji={emoji} iconSize={getNavItemIconSize(compact)} isActive={isActive} />
      <NavItemLabel label={label} compact={compact} />
      <NavItemCount
        count={count}
        countLoading={countLoading}
        className={resolveBadgeClassName(isActive, activeBadgeClassName, badgeClassName)}
        style={resolveBadgeStyle(isActive, activeBadgeClassName, activeBadgeStyle, badgeStyle)}
        compact={compact}
      />
    </Button>
  )
}

export function NavItem({ icon: Icon, emoji, label, count, countLoading, isActive, activeClassName = 'bg-primary/10 text-primary', badgeClassName, badgeStyle, activeBadgeClassName, activeBadgeStyle, onClick, disabled, disabledTooltip, compact }: {
  icon: ComponentType<IconProps>
  emoji?: string | null
  label: string
  count?: number
  countLoading?: boolean
  isActive?: boolean
  activeClassName?: string
  badgeClassName?: string
  badgeStyle?: React.CSSProperties
  activeBadgeClassName?: string
  activeBadgeStyle?: React.CSSProperties
  onClick?: () => void
  disabled?: boolean
  disabledTooltip?: string
  compact?: boolean
}) {
  const padding = getNavItemPadding(compact, countLoading || hasSidebarCount(count))
  if (disabled) {
    return (
      <DisabledNavItem
        Icon={Icon}
        emoji={emoji}
        label={label}
        compact={compact}
        disabledTooltip={disabledTooltip}
        padding={padding}
      />
    )
  }

  return (
    <ClickableNavItem
      Icon={Icon}
      emoji={emoji}
      label={label}
      count={count}
      countLoading={countLoading}
      isActive={isActive}
      activeClassName={activeClassName}
      badgeClassName={badgeClassName}
      badgeStyle={badgeStyle}
      activeBadgeClassName={activeBadgeClassName}
      activeBadgeStyle={activeBadgeStyle}
      onClick={onClick}
      compact={compact}
      padding={padding}
    />
  )
}

// --- Section Content ---

export interface SectionContentProps {
  group: SectionGroup
  itemCount: number
  selection: SidebarSelection
  onSelect: (sel: SidebarSelection) => void
  onContextMenu: (e: React.MouseEvent, type: string) => void
  dragHandleProps?: Record<string, unknown>
  isRenaming?: boolean
  renameInitialValue?: string
  onRenameSubmit?: (value: string) => void
  onRenameCancel?: () => void
  onStartRename?: (type: string) => void
  onSelectTypeNote?: (type: string) => void
  locale?: AppLocale
}

export function SectionContent({
  group, itemCount, selection, onSelect,
  onContextMenu, dragHandleProps,
  isRenaming, renameInitialValue, onRenameSubmit, onRenameCancel, locale,
  onStartRename, onSelectTypeNote,
}: SectionContentProps) {
  const { label, type, Icon, customColor } = group
  const { sectionColor, sectionLightColor } = resolveSectionColors(type, customColor)

  return (
    <SectionHeader
      label={label} type={type} Icon={Icon}
      sectionColor={sectionColor}
      sectionLightColor={sectionLightColor}
      itemCount={itemCount}
      isActive={isSelectionActive(selection, { kind: 'sectionGroup', type })}
      onSelect={() => onSelect({ kind: 'sectionGroup', type })}
      onContextMenu={(e) => onContextMenu(e, type)}
      dragHandleProps={dragHandleProps}
      isRenaming={isRenaming}
      renameInitialValue={renameInitialValue}
      onRenameSubmit={onRenameSubmit}
      onRenameCancel={onRenameCancel}
      onStartRename={onStartRename ? () => onStartRename(type) : undefined}
      onSelectTypeNote={onSelectTypeNote ? () => onSelectTypeNote(type) : undefined}
      locale={locale}
    />
  )
}

function InlineRenameInput({ initialValue, onSubmit, onCancel, locale }: {
  initialValue: string
  onSubmit: (value: string) => void
  onCancel: () => void
  locale?: AppLocale
}) {
  const {
    handleKeyDown,
    inputRef,
    setValue,
    submitValue,
    value,
  } = useSidebarInlineRenameInput({
    initialValue,
    onCancel,
    onSubmit: (nextValue) => onSubmit(nextValue.trim()),
  })

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => { void submitValue() }}
      onClick={(e) => e.stopPropagation()}
      aria-label={translate(locale ?? 'en', 'sidebar.section.name')}
      controlSize="sm" className="flex-1 border-primary bg-background px-1 text-body font-medium text-foreground"
    />
  )
}

function getSectionHeaderIconWeight(isActive: boolean): IconProps['weight'] {
  return isActive ? 'fill' : 'regular'
}

function getSectionSelectHandler(isRenaming: boolean | undefined, onSelect: () => void) {
  if (isRenaming) return undefined
  return onSelect
}

function getSectionContextMenuHandler(
  isRenaming: boolean | undefined,
  onContextMenu: (e: React.MouseEvent) => void,
) {
  if (isRenaming) return undefined
  return onContextMenu
}

function resolveInlineRenameHandlers({
  isRenaming,
  onRenameCancel,
  onRenameSubmit,
}: {
  isRenaming?: boolean
  onRenameCancel?: () => void
  onRenameSubmit?: (value: string) => void
}): { onRenameCancel: () => void; onRenameSubmit: (value: string) => void } | null {
  if (!isRenaming || !onRenameSubmit || !onRenameCancel) return null
  return { onRenameCancel, onRenameSubmit }
}

function SectionHeaderLabel({
  type,
  label,
  isActive,
  isRenaming,
  renameInitialValue,
  onRenameSubmit,
  onRenameCancel,
  onStartRename,
  locale,
}: {
  type: string
  label: string
  isActive: boolean
  sectionColor: string
  isRenaming?: boolean
  renameInitialValue?: string
  onRenameSubmit?: (value: string) => void
  onRenameCancel?: () => void
  onStartRename?: () => void
  locale?: AppLocale
}) {
  const inlineRenameHandlers = resolveInlineRenameHandlers({
    isRenaming,
    onRenameCancel,
    onRenameSubmit,
  })

  if (inlineRenameHandlers) {
    return (
      <InlineRenameInput
        key={`rename-${type}`}
        initialValue={renameInitialValue ?? label}
        onSubmit={inlineRenameHandlers.onRenameSubmit}
        onCancel={inlineRenameHandlers.onRenameCancel}
        locale={locale}
      />
    )
  }

  return (
    <Button variant="toolbar" size="toolbar"
      type="button"
      className={cn("min-w-0 truncate border-0 bg-transparent p-0 text-left text-body-lg font-medium", isActive ? "text-primary" : "text-foreground", 'ml-[4px]')}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onStartRename?.()
      }}
    >
      {label}
    </Button>
  )
}

function SectionHeaderCountPill({
  itemCount,
}: {
  itemCount: number
  isActive: boolean
  sectionColor: string
}) {
  if (itemCount <= 0) return null
  return (
    <SidebarCountPill
      count={itemCount}
      className="text-muted-foreground bg-muted"
    />
  )
}

function SectionHeader({ label, type, Icon, sectionColor, itemCount, isActive, onSelect, onContextMenu, dragHandleProps, isRenaming, renameInitialValue, onRenameSubmit, onRenameCancel, onStartRename, onSelectTypeNote, locale }: {
  label: string; type: string; Icon: ComponentType<IconProps>
  sectionColor: string; sectionLightColor: string; itemCount: number; isActive: boolean
  onSelect: () => void; onContextMenu: (e: React.MouseEvent) => void
  dragHandleProps?: Record<string, unknown>
  isRenaming?: boolean; renameInitialValue?: string
  onRenameSubmit?: (value: string) => void; onRenameCancel?: () => void
  onStartRename?: () => void; onSelectTypeNote?: () => void
  locale?: AppLocale
}) {
  const headerRef = useRef<HTMLDivElement>(null)
  const selectHandler = getSectionSelectHandler(isRenaming, onSelect)
  const contextMenuHandler = getSectionContextMenuHandler(isRenaming, onContextMenu)
  const doubleClickHandler = !isRenaming ? onSelectTypeNote : undefined

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const handleClick = () => selectHandler?.()
    const handleContextMenu = (event: MouseEvent) => contextMenuHandler?.(event as unknown as ReactMouseEvent)
    const handleDoubleClick = () => doubleClickHandler?.()

    header.addEventListener('click', handleClick)
    header.addEventListener('contextmenu', handleContextMenu)
    header.addEventListener('dblclick', handleDoubleClick)
    return () => {
      header.removeEventListener('click', handleClick)
      header.removeEventListener('contextmenu', handleContextMenu)
      header.removeEventListener('dblclick', handleDoubleClick)
    }
  }, [contextMenuHandler, doubleClickHandler, selectHandler])

  return (
    <div
      ref={headerRef}
      className={cn("group/section flex cursor-pointer select-none items-center justify-between rounded-md transition-colors", isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent", 'py-1 pr-2 pl-3 gap-[4px]')}
      {...dragHandleProps}
    >
      <div className="flex min-w-0 flex-1 items-center gap-[4px]">
        <Icon className="shrink-0" size={16} weight={getSectionHeaderIconWeight(isActive)} style={{ color: isActive ? 'var(--primary)' : sectionColor }} />
        <SectionHeaderLabel
          type={type}
          label={label}
          isActive={isActive}
          sectionColor={sectionColor}
          isRenaming={isRenaming}
          renameInitialValue={renameInitialValue}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
          onStartRename={onStartRename}
          locale={locale}
        />
      </div>
      {!isRenaming && (
        <SectionHeaderCountPill itemCount={itemCount} isActive={isActive} sectionColor={sectionColor} />
      )}
    </div>
  )
}

type VisibilityToggleHandler = (type: string, typeEntryPath?: string) => void

function VisibilityPopoverItem({
  group,
  isVisible,
  onToggle,
  locale = 'en',
}: {
  group: SectionGroup
  isVisible: boolean
  onToggle: VisibilityToggleHandler
  locale?: AppLocale
}) {
  const { label, type, Icon, customColor } = group
  const { sectionColor } = resolveSectionColors(type, customColor)

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full justify-start rounded-md px-3"

      onClick={() => onToggle(type)}
      aria-label={translate(locale, 'sidebar.section.toggle', { label })}
    >
      <Icon size={14} style={{ color: sectionColor }} />
      <span className="flex-1 text-left text-body-lg text-foreground">{label}</span>
      <ToggleSwitch on={isVisible} />
    </Button>
  )
}

function VisibilityMatrixHeader({ workspaces }: { workspaces: WorkspaceIdentity[] }) {
  return (
    <div
      className="grid items-center gap-2 px-3 pb-1"
      style={{ gridTemplateColumns: `minmax(calc(var(--control-md) * 3), 1fr) repeat(${workspaces.length}, var(--control-sm))` }}
    >
      <div />
      {workspaces.map((workspace) => (
        <div key={workspace.path} className="flex justify-center">
          <WorkspaceInitialsBadge workspace={workspace} />
        </div>
      ))}
    </div>
  )
}

function VisibilityMatrixCell({
  group,
  typeEntry,
  workspace,
  onToggle,
  locale,
}: {
  group: SectionGroup
  typeEntry: VaultEntry | null
  workspace: WorkspaceIdentity
  onToggle: VisibilityToggleHandler
  locale: AppLocale
}) {
  if (!typeEntry) {
    return <span aria-hidden="true" className="mx-auto h-px w-3 bg-border" />
  }

  return (
    <Checkbox
      checked={typeEntry.visible !== false}
      onCheckedChange={() => onToggle(group.type, typeEntry.path)}
      aria-label={translate(locale, 'sidebar.section.toggle', { label: `${group.label} ${workspace.shortLabel}` })}
      className="mx-auto"
    />
  )
}

function VisibilityMatrixRow({
  entries,
  group,
  locale,
  onToggle,
  workspaces,
}: {
  entries: VaultEntry[]
  group: SectionGroup
  locale: AppLocale
  onToggle: VisibilityToggleHandler
  workspaces: WorkspaceIdentity[]
}) {
  const { label, type, Icon, customColor } = group
  const { sectionColor } = resolveSectionColors(type, customColor)

  return (
    <div
      className="grid items-center gap-2 px-3 py-1.5"
      style={{ gridTemplateColumns: `minmax(calc(var(--control-md) * 3), 1fr) repeat(${workspaces.length}, var(--control-sm))` }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon size={14} style={{ color: sectionColor }} />
        <span className="min-w-0 truncate text-left text-body-lg text-foreground">{label}</span>
      </div>
      {workspaces.map((workspace) => (
        <VisibilityMatrixCell
          key={workspace.path}
          group={group}
          typeEntry={findTypeDefinitionForWorkspace(entries, type, workspace.path)}
          workspace={workspace}
          onToggle={onToggle}
          locale={locale}
        />
      ))}
    </div>
  )
}

function VisibilityMatrixPopover({
  entries,
  locale,
  onToggle,
  sections,
  workspaces,
}: {
  entries: VaultEntry[]
  locale: AppLocale
  onToggle: VisibilityToggleHandler
  sections: SectionGroup[]
  workspaces: WorkspaceIdentity[]
}) {
  return (
    <>
      <VisibilityMatrixHeader workspaces={workspaces} />
      {sections.map((group) => (
        <VisibilityMatrixRow
          key={group.type}
          entries={entries}
          group={group}
          locale={locale}
          onToggle={onToggle}
          workspaces={workspaces}
        />
      ))}
    </>
  )
}

// --- Visibility Popover ---

export function VisibilityPopover({ entries, sections, isSectionVisible, onToggle, workspaceOrder = [], locale = 'en' }: {
  entries: VaultEntry[]
  sections: SectionGroup[]
  isSectionVisible: (type: string) => boolean
  onToggle: VisibilityToggleHandler
  workspaceOrder?: readonly string[]
  locale?: AppLocale
}) {
  const workspaces = collectTypeVisibilityWorkspaces(entries, workspaceOrder)
  const showMatrix = workspaces.length > 1

  return (
    <div
      className="rounded-lg border border-border bg-popover text-popover-foreground absolute top-[100%] left-[6px] right-[6px] z-[50] p-[8px_0] [box-shadow:0_4px_12px_var(--shadow-dialog)]"
    >
      <div className="text-small font-semibold text-muted-foreground p-[0_12px_4px]">{translate(locale, 'sidebar.section.showInSidebar')}</div>
      {showMatrix ? (
        <VisibilityMatrixPopover
          entries={entries}
          locale={locale}
          onToggle={onToggle}
          sections={sections}
          workspaces={workspaces}
        />
      ) : (
        sections.map((group) => (
          <VisibilityPopoverItem
            key={group.type}
            group={group}
            isVisible={isSectionVisible(group.type)}
            onToggle={onToggle}
            locale={locale}
          />
        ))
      )}
    </div>
  )
}

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <div aria-hidden="true" className={cn('flex h-5 w-9 items-center rounded-full p-px transition-colors', on ? 'justify-end bg-primary' : 'justify-start bg-muted')}>
      <div className="size-4 rounded-full bg-background transition-transform" />
    </div>
  )
}
