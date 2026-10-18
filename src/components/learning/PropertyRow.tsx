import { useEffect, useRef, useState, useId } from 'react'
import {
  Check,
  DotsThreeVertical,
  PencilSimple,
  Swap,
  Trash,
} from '@phosphor-icons/react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  convertProperty,
  matchesProperty,
  type PropertyDefinition,
} from '../../lib/learning/propertyValues'
import type { LearningProperty } from '../../lib/learning/types'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import { PropertyValueEditor } from './PropertyValueEditor'
import { PropertyKindIcon, PropertyKindSelect } from './PropertyKindSelect'
import { cardEditorStyles } from './cardEditorStyles'
import { EditorIconButton } from './EditorIconButton'
type Props = {
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
  onBusyChange?: (busy: boolean) => void
}
function previewConversion(
  value: LearningProperty,
  definition: PropertyDefinition | null,
) {
  if (!definition) return null
  try {
    return { definition, value: convertProperty(value, definition) }
  } catch {
    return null
  }
}
export function PropertyRow({
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
}: Props) {
  const [key, setKey] = useState(name),
    [error, setError] = useState<string | null>(null),
    [editing, setEditing] = useState<'rename' | 'type' | null>(null)
  const [pendingDefinition, setPendingDefinition] =
    useState<PropertyDefinition | null>(null)
  const conversion = previewConversion(value, pendingDefinition)
  const [editable] = useState(
    () =>
      !!hint &&
      (matchesProperty(value, hint) ||
        (hint.valueKind === 'page' && value === '')),
  )
  const rename = useRef<HTMLInputElement>(null)
  const typeTrigger = useRef<HTMLButtonElement>(null)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const pendingFocus = useRef<'rename' | 'type' | 'mutation' | null>(null)
  const errorId = useId()
  const t = (key: TranslationKey) => translate(locale, key)
  const visibleError =
    error ??
    (pendingDefinition && !conversion
      ? t('properties.conversionRejected')
      : null)
  const cancelType = () => {
    setPendingDefinition(null)
    setEditing(null)
    setError(null)
    menuTrigger.current?.focus()
  }
  const valid =
    !!hint &&
    (matchesProperty(value, hint) ||
      (hint.valueKind === 'page' && value === ''))
  useEffect(() => {
    if (editing === 'rename') rename.current?.focus()
  }, [editing])
  return (
    <div
      role="group"
      aria-label={name}
      className="min-w-0 space-y-3 border-b pb-3 last:border-b-0"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground">
          <PropertyKindIcon definition={hint} />
        </span>
        <span className="min-w-0 flex-1 break-words font-medium">{name}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <EditorIconButton
              label={`${t('cardEditor.manageField')} ${name}`}
              ref={menuTrigger}
              data-field-menu={name}
              disabled={disabled}
            >
              <DotsThreeVertical
                className={cardEditorStyles.icon}
                aria-hidden="true"
              />
            </EditorIconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cardEditorStyles.portal}
            align="end"
            onCloseAutoFocus={(event) => {
              const requested = pendingFocus.current
              pendingFocus.current = null
              if (requested) {
                event.preventDefault()
                if (requested === 'rename') rename.current?.focus()
                if (requested === 'type') typeTrigger.current?.focus()
              }
            }}
          >
            <DropdownMenuItem
              disabled={!editable || !valid}
              onSelect={() => {
                setKey(name)
                setPendingDefinition(null)
                setError(null)
                pendingFocus.current = 'rename'
                setEditing('rename')
              }}
            >
              <PencilSimple
                className={cardEditorStyles.icon}
                aria-hidden="true"
              />
              {t('properties.rename')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!editable}
              onSelect={() => {
                setError(null)
                pendingFocus.current = 'type'
                setEditing('type')
              }}
            >
              <Swap className={cardEditorStyles.icon} aria-hidden="true" />
              {t('cardEditor.changeType')}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                pendingFocus.current = 'mutation'
                onRemove()
              }}
            >
              <Trash className={cardEditorStyles.icon} aria-hidden="true" />
              {t('common.remove')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {editing === 'rename' && (
        <div
          role="group"
          aria-label={`${t('cardEditor.applyName')} ${name}`}
          className="space-y-2"
        >
          <Input
            name="propertyName"
            autoComplete="off"
            ref={rename}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            aria-label={`${t('inspector.properties.propertyName')} ${name}`}
            value={key}
            disabled={disabled}
            onChange={(event) => {
              setKey(event.target.value)
              setError(null)
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={disabled || key === name || !valid}
              onClick={() => {
                try {
                  onRename(key)
                  setError(null)
                  setEditing(null)
                } catch {
                  setError(t('properties.invalid'))
                  rename.current?.focus()
                }
              }}
            >
              <Check className={cardEditorStyles.icon} aria-hidden="true" />
              {t('cardEditor.applyName')}
            </Button>
            <Button
              variant="ghost"
              disabled={disabled}
              onClick={() => {
                setKey(name)
                setError(null)
                setEditing(null)
                menuTrigger.current?.focus()
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
      {editable && hint ? (
        <PropertyValueEditor
          name={name}
          value={value}
          definition={hint}
          descriptionId={`${errorId}-value`}
          locale={locale}
          disabled={disabled}
          onChange={onValue}
          onBusyChange={onBusyChange}
        />
      ) : (
        <div className="rounded bg-muted p-2">
          <p className={cardEditorStyles.helper}>{t('properties.opaque')}</p>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      )}
      {editable && hint && !matchesProperty(value, hint) && (
        <p id={`${errorId}-value`} role="alert" className="text-destructive">
          {t('properties.invalidValue')}
        </p>
      )}
      {editing === 'type' && (
        <PropertyKindSelect
          definition={pendingDefinition ?? hint}
          triggerRef={typeTrigger}
          label={`${t('properties.type')} ${name}`}
          locale={locale}
          disabled={disabled || !editable}
          onChange={(definition) => {
            setPendingDefinition(definition)
            setError(null)
          }}
        />
      )}
      {conversion && (
        <div
          role="group"
          aria-label={`${t('cardEditor.applyType')} ${name}`}
          className="space-y-2 rounded border bg-muted/30 p-3"
        >
          <p className={cardEditorStyles.helper}>
            {t('cardEditor.currentValue')}
          </p>
          <pre className="whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(value)}
          </pre>
          <p className={cardEditorStyles.helper}>{t('cardEditor.nextValue')}</p>
          <pre className="whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(conversion.value)}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={disabled}
              onClick={() => {
                onDefinition(conversion.definition, conversion.value)
                setPendingDefinition(null)
                setEditing(null)
                menuTrigger.current?.focus()
              }}
            >
              <Check className={cardEditorStyles.icon} aria-hidden="true" />
              {t('cardEditor.applyType')}
            </Button>
            <Button variant="ghost" disabled={disabled} onClick={cancelType}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
      {editing === 'type' && !conversion && (
        <Button variant="ghost" disabled={disabled} onClick={cancelType}>
          {t('common.cancel')}
        </Button>
      )}
      {visibleError && (
        <p id={errorId} role="alert" className="text-destructive">
          {visibleError}
        </p>
      )}
    </div>
  )
}
