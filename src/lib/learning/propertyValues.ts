import type { LearningProperty } from './types'

export type PropertyKind = 'text' | 'number' | 'boolean' | 'date' | 'list' | 'page'
export type PropertyDefinition = { valueKind: PropertyKind; itemKind?: 'text' | 'page' | null }
export type PropertyDefinitions = Record<string, PropertyDefinition>
export type PropertyValues = Record<string, LearningProperty>
export const propertyKinds: PropertyKind[] = ['text', 'number', 'boolean', 'date', 'list', 'page']
const reserved = new Set(['id', 'revision', 'schedule', 'pageid', 'answerpageid', 'createdat', 'updatedat'])
const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i
export function propertyKey(raw: string): string {
  const key = raw.trim()
  if (!key || new TextEncoder().encode(key).length > 256 || key.startsWith('_') || reserved.has(key.toLowerCase())) throw new Error('Invalid or reserved property key')
  return key
}
export function isDateValue(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function isPageReference(value: LearningProperty): value is { pageId: string; label?: string } {
  return !!value && !Array.isArray(value) && typeof value === 'object' && typeof value.pageId === 'string' && uuid.test(value.pageId) && (value.label === undefined || typeof value.label === 'string') && Object.keys(value).every(key => key === 'pageId' || key === 'label')
}
export function isEditableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value))
}
export function inferProperty(value: LearningProperty): PropertyDefinition | null {
  if (typeof value === 'string') return { valueKind: 'text' }
  if (isEditableNumber(value)) return { valueKind: 'number' }
  if (typeof value === 'boolean') return { valueKind: 'boolean' }
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) return { valueKind: 'list', itemKind: 'text' }
  return null
}
export function matchesProperty(value: LearningProperty, definition: PropertyDefinition): boolean {
  switch (definition.valueKind) {
    case 'text': return typeof value === 'string'
    case 'number': return isEditableNumber(value)
    case 'boolean': return typeof value === 'boolean'
    case 'date': return isDateValue(value)
    case 'page': return isPageReference(value)
    case 'list': return Array.isArray(value) && value.every(item => definition.itemKind === 'page' ? isPageReference(item) : typeof item === 'string')
  }
}
export function convertProperty(value: LearningProperty, definition: PropertyDefinition): LearningProperty {
  if (matchesProperty(value, definition)) return value
  if (definition.valueKind === 'text' && (typeof value === 'number' || typeof value === 'boolean')) return String(value)
  if (typeof value === 'string') {
    if (definition.valueKind === 'number' && value !== '' && isEditableNumber(Number(value)) && String(Number(value)) === value) return Number(value)
    if (definition.valueKind === 'boolean' && (value === 'true' || value === 'false')) return value === 'true'
    if (definition.valueKind === 'list' && definition.itemKind === 'text') return [value]
  }
  throw new Error('This conversion would change or lose the original value')
}
export function renameProperty(values: PropertyValues, definitions: PropertyDefinitions, oldKey: string, rawKey: string) {
  const key = propertyKey(rawKey)
  if (!Object.hasOwn(values, oldKey)) throw new Error('Property no longer exists')
  if (key !== oldKey && Object.hasOwn(values, key)) throw new Error('Property already exists')
  const next = { ...values }; const hints = { ...definitions }
  const value = next[oldKey]; const hint = Object.hasOwn(hints, oldKey) ? hints[oldKey] : undefined
  delete next[oldKey]; delete hints[oldKey]; next[key] = value
  if (hint) hints[key] = hint
  return { values: next, definitions: hints }
}
export function removeProperty(values: PropertyValues, definitions: PropertyDefinitions, key: string) {
  const next = { ...values }; const hints = { ...definitions }
  delete next[key]; delete hints[key]
  return { values: next, definitions: hints }
}
export function defaultProperty(definition: PropertyDefinition, today: string): LearningProperty {
  switch (definition.valueKind) {
    case 'number': return 0
    case 'boolean': return false
    case 'date': return today
    case 'list': return []
    default: return ''
  }
}
