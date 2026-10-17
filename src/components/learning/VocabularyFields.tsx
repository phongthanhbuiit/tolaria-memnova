import { LinkSimple } from '@phosphor-icons/react'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { WikilinkPropertyField } from '../WikilinkPropertyField'
import { translate, type AppLocale } from '../../lib/i18n'
import type { LearningProperty } from '../../lib/learning/types'
import { addVocabularyRelation, parseVocabularyLinks, removeVocabularyRelation, vocabularyEditable, vocabularyContext, vocabularyRelations, vocabularyText } from '../../lib/learning/vocabulary'
import { useLearningWorkspace } from './LearningContext'

type Properties = Record<string, LearningProperty>
export function VocabularyFields({ properties, locale, disabled, onChange }: { properties: Properties; locale: AppLocale; disabled: boolean; onChange: (key: string, value: LearningProperty) => void }) {
  const workspace = useLearningWorkspace()
  const entries = (workspace?.entries ?? []).filter(entry => entry.path.startsWith(`${workspace?.root ?? workspace?.client?.vaultPath}/`))
  const types = Object.fromEntries(entries.filter(entry => entry.isA === 'Type').map(entry => [entry.title, entry]))
  const cardType = properties.card_type === 'vocabulary' ? 'vocabulary' : 'basic'
  return <div className="space-y-4">
    <div className="grid gap-2 text-sm font-medium"><span>{translate(locale, 'learning.cardType')}</span><Select disabled={disabled} value={cardType} onValueChange={value => onChange('card_type', value)}><SelectTrigger aria-label={translate(locale, 'learning.cardType')}><SelectValue /></SelectTrigger><SelectContent>{(['basic', 'vocabulary'] as const).map(value => <SelectItem key={value} value={value}>{translate(locale, `learning.${value}`)}</SelectItem>)}</SelectContent></Select></div>
    {cardType === 'vocabulary' && <div className="grid gap-4 sm:grid-cols-2">
      {vocabularyContext.map(([key, label]) => <label key={key} className="grid gap-2 text-sm">{translate(locale, label)}<Input disabled={disabled || !vocabularyEditable(properties[key])} value={vocabularyText(properties, key)} onChange={event => onChange(key, event.target.value)} /></label>)}
      {vocabularyRelations.map(([key, label]) => <WikilinkPropertyField key={key} id={`learning-${key}`} label={translate(locale, label)} icon={LinkSimple} locale={locale} disabled={disabled || !vocabularyEditable(properties[key])} value={vocabularyText(properties, key)} placeholder={translate(locale, 'learning.addRelated')} entries={entries} typeEntryMap={types} onAdd={target => onChange(key, addVocabularyRelation(properties[key], target))} onRemove={target => onChange(key, removeVocabularyRelation(properties[key], target))} />)}
    </div>}
  </div>
}
export function VocabularyStudyDetails({ properties, locale, answer = false }: { properties: Properties; locale: AppLocale; answer?: boolean }) {
  if (properties.card_type !== 'vocabulary') return null
  const fields = answer ? vocabularyRelations : vocabularyContext
  const visible = fields.filter(([key]) => vocabularyText(properties, key).trim())
  if (!visible.length) return null
  return <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">{visible.map(([key, label]) => { const value = vocabularyText(properties, key); return <div key={key}><dt className="text-xs font-medium text-muted-foreground">{translate(locale, label)}</dt><dd className="mt-1 break-words">{parseVocabularyLinks(value).join(', ') || value}</dd></div> })}</dl>
}
