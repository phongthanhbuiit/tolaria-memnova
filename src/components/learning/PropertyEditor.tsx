import { usePropertyEditorFocus } from './usePropertyEditorFocus'
import { useState, useId } from 'react'
import { Plus } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  defaultProperty,
  inferProperty,
  propertyKey,
  renameProperty,
  removeProperty,
  type PropertyDefinition,
  type PropertyDefinitions,
  type PropertyValues,
} from '../../lib/learning/propertyValues'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import { PropertyRow } from './PropertyRow'
import { PropertyKindSelect } from './PropertyKindSelect'
import { CardEditorSection } from './CardEditorSection'
import { cardEditorStyles } from './cardEditorStyles'
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
  title?: string
}
export function PropertyEditor({
  values,
  definitions,
  locale,
  disabled = false,
  excludedKeys = [],
  reservedKeys = [],
  validateKey,
  onChange,
  onBusyChange,
  title,
}: Props) {
  const rows = Object.entries(values).filter(
    ([key]) => !excludedKeys.includes(key),
  )
  const [name, setName] = useState(''),
    [kind, setKind] = useState<PropertyDefinition>({ valueKind: 'text' }),
    [error, setError] = useState<string | null>(null),
    [adding, setAdding] = useState(false),
    [expanded, setExpanded] = useState(rows.length > 0)
  const { root, input, addButton, requestFocus } = usePropertyEditorFocus(
    values,
    adding,
    expanded,
  )
  const errorId = useId()
  const t = (key: TranslationKey) => translate(locale, key)
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
        input.current?.focus()
        return
      }
      const date = new Date(),
        today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      requestFocus({ kind: 'menu', key })
      onChange({
        values: { ...values, [key]: defaultProperty(kind, today) },
        definitions: { ...definitions, [key]: kind },
      })
      setName('')
      setError(null)
      setAdding(false)
    } catch {
      setError(t('properties.invalid'))
      input.current?.focus()
    }
  }
  return (
    <div ref={root} className={cardEditorStyles.root}>
      <CardEditorSection
        title={title ?? t('inspector.title.properties')}
        count={new Intl.NumberFormat(locale).format(rows.length)}
        open={expanded}
        onOpenChange={setExpanded}
        action={
          <Button
            variant="ghost"
            ref={addButton}
            hidden={adding}
            disabled={disabled}
            onClick={() => {
              setExpanded(true)
              setAdding(true)
            }}
          >
            <Plus className={cardEditorStyles.icon} aria-hidden="true" />
            {t('inspector.properties.addProperty')}
          </Button>
        }
      >
        <div className="space-y-3">
          {rows.map(([key, value]) => {
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
                key={`${key}:${hint?.valueKind}:${hint?.itemKind}`}
                name={key}
                value={value}
                hint={hint}
                locale={locale}
                disabled={locked}
                onRename={(name) => {
                  validateKey?.(propertyKey(name), key)
                  if (reservedKeys.includes(name.trim()) && name.trim() !== key)
                    throw Error(t('properties.invalid'))
                  const next = renameProperty(values, definitions, key, name)
                  requestFocus({ kind: 'menu', key: propertyKey(name) })
                  onChange(next)
                }}
                onRemove={() => {
                  requestFocus({ kind: 'add' })
                  onChange(removeProperty(values, definitions, key))
                }}
                onValue={(next) => {
                  const hint = Object.hasOwn(definitions, key)
                    ? definitions[key]
                    : inferProperty(values[key])
                  onChange({
                    values: { ...values, [key]: next },
                    definitions: hint
                      ? { ...definitions, [key]: hint }
                      : definitions,
                  })
                }}
                onDefinition={(definition, next) => {
                  requestFocus({ kind: 'menu', key })
                  onChange({
                    values: { ...values, [key]: next },
                    definitions: { ...definitions, [key]: definition },
                  })
                }}
                onBusyChange={onBusyChange}
              />
            )
          })}
          <div
            hidden={!adding}
            role="group"
            aria-label={t('inspector.properties.addProperty')}
            className="space-y-3 rounded-md border bg-muted/20 p-3"
          >
            <Input
              name="propertyName"
              autoComplete="off"
              ref={input}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              aria-label={t('inspector.properties.propertyName')}
              placeholder={t('inspector.properties.propertyName')}
              value={name}
              disabled={disabled}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
            />
            <PropertyKindSelect
              definition={kind}
              label={t('properties.type')}
              locale={locale}
              disabled={disabled}
              onChange={setKind}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={disabled || !name.trim()}
                onClick={add}
              >
                <Plus className={cardEditorStyles.icon} aria-hidden="true" />
                {t('inspector.properties.addProperty')}
              </Button>
              <Button
                variant="ghost"
                disabled={disabled}
                onClick={() => {
                  setName('')
                  setError(null)
                  setAdding(false)
                  requestFocus({ kind: 'add' })
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
            {error && (
              <p id={errorId} role="alert" className="text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
      </CardEditorSection>
    </div>
  )
}
