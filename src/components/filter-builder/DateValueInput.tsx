import { useEffect, useState } from 'react'
import { CalendarBlank } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAppLocale } from '@/hooks/useAppPreferences'
import { translate } from '@/lib/i18n'
import { formatDateForDisplay } from '@/utils/dateDisplay'
import { parseDateFilterInput } from '@/utils/filterDates'

const DATE_PREVIEW_DEBOUNCE_MS = 250

export function DateValueInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const locale = useAppLocale()
  const selected = value ? parseDateFilterInput(value) ?? undefined : undefined
  const [showPreview, setShowPreview] = useState(false)
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), DATE_PREVIEW_DEBOUNCE_MS)
    return () => window.clearTimeout(timeoutId)
  }, [value])

  const previewValue = showPreview ? debouncedValue.trim() : ''
  const resolvedPreview = previewValue ? parseDateFilterInput(previewValue) : null
  const previewLabel = resolvedPreview
    ? formatDateForDisplay(resolvedPreview, 'friendly', locale)
    : previewValue
      ? translate(locale, 'filters.date.unrecognized')
      : null

  return (
    <div className="flex flex-1 min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-1">
        <Input
          className="h-8 flex-1 min-w-0 text-sm"
          placeholder={translate(locale, 'filters.date.inputPlaceholder')}
          value={value}
          onChange={(e) => {
            setShowPreview(true)
            onChange(e.target.value)
          }}
          onFocus={() => setShowPreview(true)}
          onBlur={() => setShowPreview(false)}
          data-testid="date-value-input"
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="date-picker-trigger"
              className="h-8 w-8 shrink-0 px-0"
              title={selected ? formatDateForDisplay(selected, 'friendly', locale) : translate(locale, 'filters.date.pickDate')}
              aria-label={selected
                ? translate(locale, 'filters.date.openPickerForDate', { date: formatDateForDisplay(selected, 'friendly', locale) })
                : translate(locale, 'filters.date.openPicker')}
            >
              <CalendarBlank size={14} className="shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(day) => onChange(day ? format(day, 'yyyy-MM-dd') : '')}
            />
          </PopoverContent>
        </Popover>
      </div>
      {previewLabel && (
        <div
          className="pl-1 text-[11px] text-muted-foreground"
          data-testid={resolvedPreview ? 'date-value-preview' : 'date-value-preview-unrecognized'}
        >
          {resolvedPreview ? translate(locale, 'filters.date.resolvesTo', { date: previewLabel }) : previewLabel}
        </div>
      )}
    </div>
  )
}
