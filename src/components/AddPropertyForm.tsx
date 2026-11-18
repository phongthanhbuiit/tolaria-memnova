import { CalendarBlank as CalendarIcon, Check, X } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  type PropertyDisplayMode,
  formatDateValue,
  toISODate,
} from '../utils/propertyTypes'
import { StatusPill, StatusDropdown } from './StatusDropdown'
import { DISPLAY_MODE_OPTIONS, DISPLAY_MODE_ICONS } from '../utils/propertyTypes'
import { translate, type AppLocale } from '../lib/i18n'
import { useDateDisplayFormat } from '../hooks/useAppPreferences'

function parseDateValue(value: string): Date | undefined {
  const iso = toISODate(value)
  const d = new Date(iso + 'T00:00:00')
  return isNaN(d.getTime()) ? undefined : d
}

function dateToISO(day: Date): string {
  const yyyy = day.getFullYear()
  const mm = String(day.getMonth() + 1).padStart(2, '0')
  const dd = String(day.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const ADD_INPUT_CLASS = "min-w-[60px] flex-1 rounded-md border border-border bg-muted px-2 text-body text-foreground outline-none focus:border-primary"

function isValidNumberValue(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return false
  return Number.isFinite(Number(trimmed))
}

function canSubmitProperty({ key, value, displayMode }: { key: string; value: string; displayMode: PropertyDisplayMode }): boolean {
  if (!key.trim()) return false
  return displayMode !== 'number' || isValidNumberValue(value)
}

function AddBooleanInput({ value, locale, onChange }: { value: string; locale: AppLocale; onChange: (v: string) => void }) {
  const boolVal = value.toLowerCase() === 'true'
  return (
    <Button variant="ghost" size="sm" type="button"
      className="min-w-[60px] flex-1 rounded-md border border-border bg-muted px-2 text-body text-secondary-foreground transition-colors hover:bg-accent"
      onClick={() => onChange(boolVal ? 'false' : 'true')}
      data-testid="add-property-boolean-toggle"
    >
      {boolVal ? `\u2713 ${translate(locale, 'inspector.properties.yes')}` : `\u2717 ${translate(locale, 'inspector.properties.no')}`}
    </Button>
  )
}

function AddDateInput({
  value,
  locale,
  onChange,
}: {
  value: string
  locale: AppLocale
  onChange: (v: string) => void
}) {
  const dateDisplayFormat = useDateDisplayFormat()
  const selectedDate = value ? parseDateValue(value) : undefined
  const formatted = value ? formatDateValue(value, dateDisplayFormat, locale) : ''
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" type="button"
          className="inline-flex min-w-[60px] flex-1 cursor-pointer items-center gap-[6px] rounded-md border border-border bg-muted px-2 text-body transition-colors hover:bg-accent"
          data-testid="add-property-date-trigger"
        >
          <CalendarIcon className="size-[16px] shrink-0 text-text-secondary" />
          <span className={`min-w-0 truncate${!formatted ? ' text-text-secondary' : ' text-foreground'}`}>
            {formatted || translate(locale, 'inspector.properties.pickDate')}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <Calendar
          appLocale={locale}
          mode="single"
          selected={selectedDate}
          onSelect={(day) => { if (day) onChange(dateToISO(day)) }}
          defaultMonth={selectedDate}
        />
      </PopoverContent>
    </Popover>
  )
}

function AddStatusInput({ value, onChange, vaultStatuses, locale }: { locale: AppLocale; value: string; onChange: (v: string) => void; vaultStatuses: string[] }) {
  const [showDropdown, setShowDropdown] = useState(false)
  return (
    <span className="relative inline-flex min-w-[60px] flex-1 items-center">
      <Button variant="ghost" size="sm" type="button"
        className="inline-flex min-w-[60px] flex-1 cursor-pointer items-center gap-[6px] rounded-md border border-border bg-muted px-2 text-body transition-colors hover:bg-accent"
        onClick={() => setShowDropdown(true)}
        data-testid="add-property-status-trigger"
      >
        {value ? <StatusPill status={value} /> : <span className="text-text-secondary">{translate(locale, 'inspector.propertyLabel.status')}{'\u2026'}</span>}
      </Button>
      {showDropdown && (
        <StatusDropdown
          value={value}
          vaultStatuses={vaultStatuses}
          onSave={(v) => { onChange(v); setShowDropdown(false) }}
          onCancel={() => setShowDropdown(false)}
        />
      )}
    </span>
  )
}

function AddNumberInput({ value, onChange, onKeyDown }: {
  value: string
  onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  return (
    <Input controlSize="sm"
      className={`${ADD_INPUT_CLASS} font-mono tabular-nums`}
      type="text"
      inputMode="decimal"
      placeholder="0"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      data-testid="add-property-number-input"
    />
  )
}

function AddPropertyValueInput({ displayMode, value, onChange, onKeyDown, vaultStatuses, locale }: {
  displayMode: PropertyDisplayMode; value: string; onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void; vaultStatuses: string[]
  locale: AppLocale
}) {
  switch (displayMode) {
    case 'number':
      return <AddNumberInput value={value} onChange={onChange} onKeyDown={onKeyDown} />
    case 'boolean': return <AddBooleanInput value={value} locale={locale} onChange={onChange} />
    case 'date': return <AddDateInput value={value} locale={locale} onChange={onChange} />
    case 'status': return <AddStatusInput locale={locale} value={value} onChange={onChange} vaultStatuses={vaultStatuses} />
    case 'tags': return (
      <Input controlSize="sm" className={ADD_INPUT_CLASS} type="text" placeholder="tag1, tag2, ..." value={value}
        onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
      />
    )
    default: return (
      <Input controlSize="sm" className={ADD_INPUT_CLASS} type="text" placeholder={translate(locale, 'inspector.properties.valuePlaceholder')} value={value}
        onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
      />
    )
  }
}

export function AddPropertyForm({ onAdd, onCancel, vaultStatuses, locale = 'en' }: {
  onAdd: (key: string, value: string, displayMode: PropertyDisplayMode) => void; onCancel: () => void
  vaultStatuses: string[]
  locale?: AppLocale
}) {
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [displayMode, setDisplayMode] = useState<PropertyDisplayMode>('text')
  const canSubmit = canSubmitProperty({ key: newKey, value: newValue, displayMode })

  const handleModeChange = (mode: PropertyDisplayMode) => {
    setDisplayMode(mode)
    if (mode === 'boolean') setNewValue('false')
    else if (mode !== displayMode) setNewValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) onAdd(newKey, newValue, displayMode)
    else if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-md px-2 py-1" data-testid="add-property-form">
      <Input controlSize="sm"
        className="w-20 shrink-0 rounded-md border border-border bg-muted px-2 text-body text-foreground outline-none focus:border-primary"
        type="text" placeholder={translate(locale, 'inspector.properties.propertyName')} value={newKey}
        onChange={(e) => setNewKey(e.target.value)} onKeyDown={handleKeyDown} autoFocus
      />
      <Select value={displayMode} onValueChange={(v) => handleModeChange(v as PropertyDisplayMode)}>
        <SelectTrigger
          size="sm"
          className="w-[72px] shrink-0 gap-[6px] border-border bg-muted px-2 py-0 shadow-none"
          aria-label={translate(locale, 'properties.type')}
          data-testid="add-property-type-trigger"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" side="left">
          {DISPLAY_MODE_OPTIONS.map(opt => {
            const OptIcon = DISPLAY_MODE_ICONS[opt.value]
            return (
              <SelectItem key={opt.value} value={opt.value}>
                <OptIcon className="size-[16px] text-text-secondary" />
                {translate(locale, opt.labelKey)}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      <AddPropertyValueInput displayMode={displayMode} value={newValue} onChange={setNewValue} onKeyDown={handleKeyDown} vaultStatuses={vaultStatuses} locale={locale} />
      <Button
        variant="outline" size="icon-sm" onClick={() => onAdd(newKey, newValue, displayMode)}
        disabled={!canSubmit} aria-label={translate(locale, 'inspector.properties.addProperty')} title={translate(locale, 'inspector.properties.addProperty')}
        data-testid="add-property-confirm"
      >
        <Check className="size-[16px]" />
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={onCancel} aria-label={translate(locale, 'common.cancel')} title={translate(locale, 'common.cancel')} data-testid="add-property-cancel">
        <X className="size-[16px]" />
      </Button>
    </div>
  )
}
