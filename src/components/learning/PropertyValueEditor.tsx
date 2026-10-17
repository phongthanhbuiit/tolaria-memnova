import { EditorIconButton } from './EditorIconButton'
import { CalendarBlank, Plus, X } from '@phosphor-icons/react'
import { cardEditorStyles } from './cardEditorStyles'
import { useState } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { Calendar } from '../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { SourcePagePicker } from './SourcePagePicker'
import {
  isEditableNumber,
  isPageReference,
  type PropertyDefinition,
} from '../../lib/learning/propertyValues'
import type { LearningProperty } from '../../lib/learning/types'
import { translate, type AppLocale } from '../../lib/i18n'

type Props = {
  name: string
  value: LearningProperty
  definition: PropertyDefinition
  locale: AppLocale
  disabled: boolean
  onChange: (value: LearningProperty) => void
  onBusyChange?: (busy: boolean) => void
  descriptionId?: string
}
function NumberValue({
  name,
  value,
  disabled,
  onChange,
  descriptionId,
}: Pick<Props, 'name' | 'value' | 'disabled' | 'onChange' | 'descriptionId'>) {
  const [text, setText] = useState(String(value))
  const valid = text.trim() !== '' && isEditableNumber(Number(text))
  return (
    <Input
      aria-label={name}
      name={name}
      autoComplete="off"
      aria-describedby={!valid ? descriptionId : undefined}
      inputMode="decimal"
      value={text}
      aria-invalid={!valid}
      disabled={disabled}
      onChange={(event) => {
        setText(event.target.value)
        onChange(
          event.target.value.trim() !== '' &&
            Number.isFinite(Number(event.target.value))
            ? Number(event.target.value)
            : event.target.value,
        )
      }}
    />
  )
}
function DateValue({ name, value, disabled, onChange, locale }: Props) {
  const [open, setOpen] = useState(false)
  const text = typeof value === 'string' ? value : ''
  const date = text ? new Date(`${text}T12:00:00`) : undefined
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled} aria-label={name}>
          <CalendarBlank className={cardEditorStyles.icon} aria-hidden="true" />
          {text || translate(locale, 'inspector.properties.pickDate')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`${cardEditorStyles.portal} w-auto p-0`}>
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={(date) => {
            if (date) {
              onChange(
                `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
              )
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function PageValue(
  props: Pick<
    Props,
    'name' | 'value' | 'locale' | 'disabled' | 'onChange' | 'onBusyChange'
  >,
) {
  const { name, value, locale, disabled, onChange, onBusyChange } = props
  return (
    <SourcePagePicker
      label={name}
      value={isPageReference(value) ? value.pageId : null}
      locale={locale}
      disabled={disabled}
      onBusyChange={onBusyChange}
      onChange={(page) => onChange({ pageId: page.id, label: page.title })}
    />
  )
}
function ListValue(props: Props) {
  const { name, value, definition, locale, disabled, onChange, onBusyChange } =
    props
  const items = Array.isArray(value) ? value : []
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            {definition.itemKind === 'page' ? (
              <PageValue
                name={`${name} ${index + 1}`}
                value={item}
                locale={locale}
                disabled={disabled}
                onBusyChange={onBusyChange}
                onChange={(next) =>
                  onChange(items.map((old, i) => (i === index ? next : old)))
                }
              />
            ) : (
              <Input
                aria-label={`${name} ${index + 1}`}
                value={String(item)}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    items.map((old, i) =>
                      i === index ? event.target.value : old,
                    ),
                  )
                }
              />
            )}
          </div>
          <EditorIconButton
            label={`${translate(locale, 'common.remove')} ${name} ${index + 1}`}
            disabled={disabled}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <X className={cardEditorStyles.icon} aria-hidden="true" />
          </EditorIconButton>
        </div>
      ))}
      {definition.itemKind === 'page' ? (
        <PageValue
          name={name}
          value={null}
          locale={locale}
          disabled={disabled}
          onBusyChange={onBusyChange}
          onChange={(next) => onChange([...items, next])}
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...items, ''])}
        >
          <Plus className={cardEditorStyles.icon} aria-hidden="true" />
          {translate(locale, 'properties.addItem')}
        </Button>
      )}
    </div>
  )
}
export function PropertyValueEditor(props: Props) {
  const { name, value, definition, locale, disabled, onChange, onBusyChange } =
    props
  switch (definition.valueKind) {
    case 'number':
      return (
        <NumberValue
          name={name}
          value={value}
          disabled={disabled}
          onChange={onChange}
          descriptionId={props.descriptionId}
        />
      )
    case 'boolean':
      return (
        <Switch
          aria-label={name}
          checked={value === true}
          disabled={disabled}
          onCheckedChange={onChange}
        />
      )
    case 'date':
      return (
        <DateValue
          name={name}
          value={value}
          definition={definition}
          locale={locale}
          disabled={disabled}
          onChange={onChange}
        />
      )
    case 'page':
      return (
        <PageValue
          name={name}
          value={value}
          locale={locale}
          disabled={disabled}
          onChange={onChange}
          onBusyChange={onBusyChange}
        />
      )
    case 'list':
      return (
        <ListValue
          name={name}
          value={value}
          definition={definition}
          locale={locale}
          disabled={disabled}
          onChange={onChange}
          onBusyChange={onBusyChange}
        />
      )
    default:
      return (
        <Input
          aria-label={name}
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )
  }
}
