import { Archive, FileText, Tray, House, Brain } from '@phosphor-icons/react'
import type { SidebarSelection } from '../../types'
import { isSelectionActive, NavItem } from '../SidebarParts'
import { TooltipProvider } from '../ui/tooltip'
import { translate, type AppLocale } from '../../lib/i18n'

interface SidebarTopNavProps {
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  showInbox: boolean
  inboxCount: number
  activeCount: number
  archivedCount: number
  /** Number of FSRS notes due for review today */
  reviewCount?: number
  locale?: AppLocale
  loading?: boolean
}

export function SidebarTopNav({
  selection,
  onSelect,
  showInbox,
  inboxCount,
  activeCount,
  archivedCount,
  reviewCount = 0,
  locale = 'en',
  loading = false,
}: SidebarTopNavProps) {
  return (
    <TooltipProvider>
      <div className="border-b border-border" data-testid="sidebar-top-nav" style={{ padding: 'calc(var(--spacing))' }}>
        <NavItem
          icon={House}
          label={translate(locale, 'sidebar.nav.home')}
          description={translate(locale, 'sidebar.nav.homeHelp')}
          isActive={isSelectionActive(selection, { kind: 'filter', filter: 'home' })}
          onClick={() => onSelect({ kind: 'filter', filter: 'home' })}
        />
        {showInbox && (
          <NavItem
            icon={Tray}
            label={translate(locale, 'sidebar.nav.inbox')}
            count={inboxCount}
            countLoading={loading}
            isActive={isSelectionActive(selection, { kind: 'filter', filter: 'inbox' })}
            badgeClassName="text-muted-foreground"
            badgeStyle={{ background: 'var(--muted)' }}
            onClick={() => onSelect({ kind: 'filter', filter: 'inbox' })}
          />
        )}
        <NavItem
          icon={FileText}
          label={translate(locale, 'sidebar.nav.allNotes')}
          count={activeCount}
          countLoading={loading}
          isActive={isSelectionActive(selection, { kind: 'filter', filter: 'all' })}
          badgeClassName="text-muted-foreground"
          badgeStyle={{ background: 'var(--muted)' }}
          onClick={() => onSelect({ kind: 'filter', filter: 'all' })}
        />
        <NavItem
          icon={Brain}
          label={translate(locale, 'sidebar.nav.decks')}
          description={translate(locale, 'sidebar.nav.decksHelp')}
          count={reviewCount}
          countLoading={loading}
          isActive={isSelectionActive(selection, { kind: 'filter', filter: 'decks' })}
          badgeClassName="text-muted-foreground"
          badgeStyle={{ background: 'var(--muted)' }}
          onClick={() => onSelect({ kind: 'filter', filter: 'decks' })}
        />
        <NavItem
          icon={Archive}
          label={translate(locale, 'sidebar.nav.archive')}
          count={archivedCount}
          countLoading={loading}
          isActive={isSelectionActive(selection, { kind: 'filter', filter: 'archived' })}
          badgeClassName="text-muted-foreground"
          badgeStyle={{ background: 'var(--muted)' }}
          onClick={() => onSelect({ kind: 'filter', filter: 'archived' })}
        />
      </div>
    </TooltipProvider>
  )
}
