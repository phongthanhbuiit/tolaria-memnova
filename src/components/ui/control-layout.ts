/** Opt-in layout for localized forms and toolbars. Default controls stay compact. */
export const controlLayouts = {
  default: '',
  responsive: 'min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere] touch-manipulation [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px]',
} as const

export type ControlLayout = keyof typeof controlLayouts
