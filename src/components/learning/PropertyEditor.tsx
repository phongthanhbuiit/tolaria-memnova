import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { PropertyValueEditor } from './PropertyValueEditor'
import {
  convertProperty,
  defaultProperty,
  inferProperty,
  matchesProperty,
  propertyKey,
  renameProperty,
  removeProperty,
  type PropertyDefinition,
  type PropertyDefinitions,
  type PropertyValues,
} from '../../lib/learning/propertyValues'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import type { LearningProperty } from '../../lib/learning/types'
const kinds = [
  'text',
  'number',
  'boolean',
  'date',
  'list-text',
  'page',
  'list-page',
] as const
const definitionFor = (kind: string): PropertyDefinition =>
  kind.startsWith('list-')
    ? { valueKind: 'list', itemKind: kind === 'list-page' ? 'page' : 'text' }
    : { valueKind: kind as PropertyDefinition['valueKind'] }
const kindFor = (definition: PropertyDefinition | null) =>
  definition?.valueKind === 'list'
    ? `list-${definition.itemKind}`
    : (definition?.valueKind ?? '')
function KindSelect({
  value,
  locale,
  disabled,
  onChange,
  label,
}: {
  value: string
  locale: AppLocale
  disabled: boolean
  onChange: (definition: PropertyDefinition) => void
  label: string
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(value) => onChange(definitionFor(value))}
    >
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={translate(locale, 'properties.opaque')} />
      </SelectTrigger>
      <SelectContent>
        {kinds.map((kind) => (
          <SelectItem key={kind} value={kind}>
            {translate(locale, `properties.kind.${kind}` as TranslationKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
type Change = { values: PropertyValues; definitions: PropertyDefinitions }
type Props = {
  values: PropertyValues
  definitions: PropertyDefinitions
  locale: AppLocale
  disabled?: boolean
  excludedKeys?: readonly string[]
  reservedKeys?: readonly string[]
  validateKey?: (key: string, oldKey?: string) => void
  onChange: (change: Change) => void
  onBusyChange?: (busy: boolean) => void
}
function PropertyRow(props: {
  name: string
  value: LearningProperty
  hint: PropertyDefinition | null
  locale: AppLocale
  disabled: boolean
  onRename: (key: string) => void
  onRemove: () => void
  onValue: (value: LearningProperty) => void
  onDefinition: (
    definition: PropertyDefinition,
    value: LearningProperty,
  ) => void
  onBusyChange?: Props['onBusyChange']
}) {
  const {
    name,
    value,
    hint,
    locale,
    disabled,
    onRename,
    onRemove,
    onValue,
    onDefinition,
    onBusyChange,
  } = props
  const [key, setKey] = useState(name),
    [error, setError] = useState<string | null>(null)
  const [conversion, setConversion] = useState<{
    definition: PropertyDefinition
    value: LearningProperty
  } | null>(null)
  // Preserve the editor while a user temporarily clears a number. Initial mismatch stays read-only.
  const [editable] = useState(
    () =>
      !!hint &&
      (matchesProperty(value, hint) ||
        (hint.valueKind === 'page' && value === '')),
  )
  const t = (key: TranslationKey) => translate(locale, key)
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={`${t('inspector.properties.propertyName')} ${name}`}
          className="min-w-0 flex-1"
          value={key}
          disabled={disabled || !editable}
          onChange={(event) => setKey(event.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !editable || key === name}
          onClick={() => {
            try {
              onRename(key)
              setError(null)
            } catch {
              setError(t('properties.invalid'))
            }
          }}
        >
          {t('properties.rename')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${t('common.remove')} ${name}`}
          disabled={disabled}
          onClick={onRemove}
        >
          {t('common.remove')}
        </Button>
      </div>
      <KindSelect
        value={kindFor(hint)}
        label={`${t('properties.type')} ${name}`}
        locale={locale}
        disabled={disabled || !editable}
        onChange={(definition) => {
          try {
            setConversion({
              definition,
              value: convertProperty(value, definition),
            })
            setError(null)
          } catch {
            setError(t('properties.conversionRejected'))
          }
        }}
      />
      {editable && hint ? (
        <PropertyValueEditor
          name={name}
          value={value}
          definition={hint}
          locale={locale}
          disabled={disabled}
          onChange={onValue}
          onBusyChange={onBusyChange}
        />
      ) : (
        <div className="rounded bg-muted p-2">
          <p className="text-xs text-muted-foreground">
            {t('properties.opaque')}
          </p>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      )}
      {conversion && (
        <div className="space-y-2 rounded border p-2">
          <pre className="whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(conversion.value)}
          </pre>
          <Button
            size="sm"
            disabled={disabled}
            onClick={() => {
              onDefinition(conversion.definition, conversion.value)
              setConversion(null)
            }}
          >
            {t('common.save')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => setConversion(null)}
          >
            {t('common.cancel')}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
export function PropertyEditor(props: Props) {
  const {
    values,
    definitions,
    locale,
    disabled = false,
    excludedKeys = [],
    reservedKeys = [],
    validateKey,
    onChange,
    onBusyChange,
  } = props
  const [name, setName] = useState(''),
    [kind, setKind] = useState<PropertyDefinition>({ valueKind: 'text' }),
    [error, setError] = useState<string | null>(null)
  const t = (key: TranslationKey) => translate(locale, key)
  const setValue = (key: string, value: LearningProperty) => {
    const hint = Object.hasOwn(definitions, key)
      ? definitions[key]
      : inferProperty(values[key])
    onChange({
      values: { ...values, [key]: value },
      definitions: hint ? { ...definitions, [key]: hint } : definitions,
    })
  }
  const add = () => {
    try {
      const key = propertyKey(name)
      validateKey?.(key)
      if (
        Object.hasOwn(values, key) ||
        excludedKeys.includes(key) ||
        reservedKeys.includes(key)
      ) {
        setError(t('properties.duplicate'))
        return
      }
      const date = new Date()
      const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      onChange({
        values: { ...values, [key]: defaultProperty(kind, today) },
        definitions: { ...definitions, [key]: kind },
      })
      setName('')
      setError(null)
    } catch {
      setError(t('properties.invalid'))
    }
  }
  return (
    <div className="min-w-0 space-y-3">
      {Object.entries(values)
        .filter(([key]) => !excludedKeys.includes(key))
        .map(([key, value]) => {
          const hint = Object.hasOwn(definitions, key)
            ? definitions[key]
            : inferProperty(value)
          let locked = disabled
          try {
            locked ||= propertyKey(key) !== key
          } catch {
            locked = true
          }
          return (
            <PropertyRow
              key={`${key}:${kindFor(hint)}`}
              name={key}
              value={value}
              hint={hint}
              locale={locale}
              disabled={locked}
              onRename={(name) => {
                validateKey?.(propertyKey(name), key)
                if (reservedKeys.includes(name.trim()) && name.trim() !== key)
                  throw Error(t('properties.invalid'))
                onChange(renameProperty(values, definitions, key, name))
              }}
              onRemove={() =>
                onChange(removeProperty(values, definitions, key))
              }
              onValue={(value) => setValue(key, value)}
              onDefinition={(definition, value) =>
                onChange({
                  values: { ...values, [key]: value },
                  definitions: { ...definitions, [key]: definition },
                })
              }
              onBusyChange={onBusyChange}
            />
          )
        })}
      <div className="grid gap-2 rounded-lg border border-dashed p-3">
        <Input
          aria-label={t('inspector.properties.propertyName')}
          placeholder={t('inspector.properties.propertyName')}
          value={name}
          disabled={disabled}
          onChange={(event) => setName(event.target.value)}
        />
        <KindSelect
          value={kindFor(kind)}
          label={t('properties.type')}
          locale={locale}
          disabled={disabled}
          onChange={setKind}
        />
        <Button
          variant="outline"
          disabled={disabled || !name.trim()}
          onClick={add}
        >
          {t('inspector.properties.addProperty')}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
