import type { CSSProperties } from 'react'

export const PROPERTY_PANEL_GRID_STYLE = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(min(100%, max(7rem, (100% - 0.5rem) / 2))), 1fr))',
} satisfies CSSProperties

export const PROPERTY_PANEL_ROW_STYLE = {
  gridColumn: '1 / -1',
  gridTemplateColumns: 'subgrid',
} satisfies CSSProperties

export const PROPERTY_PANEL_LABEL_CLASS_NAME = 'flex min-w-0 max-w-full items-center gap-1.5 text-body text-text-secondary'

export const PROPERTY_PANEL_PLACEHOLDER_LABEL_CLASS_NAME = 'flex min-w-0 max-w-full items-center gap-1.5 text-body text-text-secondary'

export const PROPERTY_PANEL_LABEL_ICON_SLOT_CLASS_NAME = 'flex size-5 shrink-0 items-center justify-center'

export const PROPERTY_PANEL_INTERACTIVE_ROW_CLASS_NAME = 'grid min-h-(--control-sm) w-full min-w-0 grid-cols-2 items-center gap-2 rounded-md px-2 text-left text-body font-normal shadow-none outline-none transition-colors hover:bg-muted hover:text-text-secondary focus-visible:bg-muted focus-visible:ring-1 focus-visible:ring-primary'

export const PROPERTY_PANEL_PLACEHOLDER_VALUE_CLASS_NAME = 'min-w-0 truncate text-body text-text-secondary'
