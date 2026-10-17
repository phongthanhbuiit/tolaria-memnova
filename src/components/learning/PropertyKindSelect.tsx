import type { Ref } from 'react'
import {
  CalendarBlank,
  FileText,
  Hash,
  LinkSimple,
  ListBullets,
  TextT,
  ToggleLeft,
} from '@phosphor-icons/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import type { PropertyDefinition } from '../../lib/learning/propertyValues'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import { cardEditorStyles } from './cardEditorStyles'
const kinds = [
  'text',
  'number',
  'boolean',
  'date',
  'list-text',
  'page',
  'list-page',
] as const
function definitionFor(kind: string): PropertyDefinition {
  return kind.startsWith('list-')
    ? { valueKind: 'list', itemKind: kind === 'list-page' ? 'page' : 'text' }
    : { valueKind: kind as PropertyDefinition['valueKind'] }
}
export function PropertyKindIcon({
  definition,
}: {
  definition: PropertyDefinition | null
}) {
  const icons = {
    text: TextT,
    number: Hash,
    boolean: ToggleLeft,
    date: CalendarBlank,
    list: ListBullets,
    page: LinkSimple,
  }
  const Icon = definition ? icons[definition.valueKind] : FileText
  return <Icon className={cardEditorStyles.icon} aria-hidden="true" />
}
export function PropertyKindSelect({
  definition,
  locale,
  disabled,
  onChange,
  label,
  triggerRef,
}: {
  definition: PropertyDefinition | null
  locale: AppLocale
  disabled: boolean
  onChange: (definition: PropertyDefinition) => void
  label: string
  triggerRef?: Ref<HTMLButtonElement>
}) {
  const value =
    definition?.valueKind === 'list'
      ? `list-${definition.itemKind}`
      : (definition?.valueKind ?? '')
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(value) => onChange(definitionFor(value))}
    >
      <SelectTrigger ref={triggerRef} aria-label={label}>
        <PropertyKindIcon definition={definition} />
        <SelectValue placeholder={translate(locale, 'properties.opaque')} />
      </SelectTrigger>
      <SelectContent className={cardEditorStyles.portal}>
        {kinds.map((kind) => (
          <SelectItem key={kind} value={kind}>
            {translate(locale, `properties.kind.${kind}` as TranslationKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
