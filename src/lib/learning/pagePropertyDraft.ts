import type { FrontmatterValue } from '../../components/Inspector'
import type { LearningPage, LearningProperty } from './types'
import {
  isEditableNumber,
  isPageReference,
  type PropertyDefinitions,
  type PropertyValues,
} from './propertyValues'
export const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b)
function reference(
  value: LearningProperty,
  pages: LearningPage[],
): LearningProperty {
  if (typeof value !== 'string') return value
  const match = value.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/)
  if (!match) return value
  const byPath = pages.filter(
    (page) => page.path.replace(/\.(md|markdown)$/i, '') === match[1],
  )
  const choices = byPath.length
    ? byPath
    : pages.filter((page) => page.title === match[1])
  return choices.length === 1
    ? { pageId: choices[0].id, label: match[2] ?? choices[0].title }
    : value
}
export function pageEditorValues(
  values: PropertyValues,
  definitions: PropertyDefinitions,
  pages: LearningPage[],
): PropertyValues {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      const hint = Object.hasOwn(definitions, key) ? definitions[key] : null
      if (hint?.valueKind === 'page') return [key, reference(value, pages)]
      if (hint?.valueKind === 'list') {
        const items = Array.isArray(value)
          ? value
          : typeof value === 'string'
            ? [value]
            : null
        if (items)
          return [
            key,
            hint.itemKind === 'page'
              ? items.map((item) => reference(item, pages))
              : items,
          ]
      }
      return [key, value]
    }),
  )
}
function wireReference(value: LearningProperty, pages: LearningPage[]): string {
  if (!isPageReference(value)) throw Error('Select a registered page')
  const page = pages.find((page) => page.id === value.pageId)
  if (!page) throw Error('The selected page is unavailable')
  return `[[${page.path.replace(/\.(md|markdown)$/i, '')}]]`
}
export function pageWireValues(
  values: PropertyValues,
  definitions: PropertyDefinitions,
  pages: LearningPage[],
  original: PropertyValues,
  originalEditor: PropertyValues,
): PropertyValues {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      if (Object.hasOwn(original, key) && sameValue(value, originalEditor[key]))
        return [key, original[key]]
      const hint = Object.hasOwn(definitions, key) ? definitions[key] : null
      if (hint?.valueKind === 'page') return [key, wireReference(value, pages)]
      if (
        hint?.valueKind === 'list' &&
        hint.itemKind === 'page' &&
        Array.isArray(value)
      )
        return [key, value.map((item) => wireReference(item, pages))]
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        isEditableNumber(value) ||
        (Array.isArray(value) &&
          value.every((item) => typeof item === 'string'))
      )
        return [key, value]
      throw Error('Unsupported Markdown property value')
    }),
  )
}
export type PagePropertyWriter = {
  update: (key: string, value: FrontmatterValue) => Promise<unknown>
  remove: (key: string) => Promise<unknown>
}
/** Mutate progress only after each acknowledged write. Hint retries never call this writer. */
export async function persistPageValues(
  progress: PropertyValues,
  values: PropertyValues,
  writer: PagePropertyWriter,
  active: () => boolean,
) {
  for (const [key, value] of Object.entries(values)) {
    if (Object.hasOwn(progress, key) && sameValue(value, progress[key]))
      continue
    if (!active()) throw Error('Page or Library changed')
    if (
      !(
        value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        isEditableNumber(value) ||
        (Array.isArray(value) &&
          value.every((item) => typeof item === 'string'))
      )
    )
      throw Error('Unsupported Markdown property value')
    await writer.update(key, value)
    progress[key] = value
  }
  for (const key of Object.keys(progress)) {
    if (Object.hasOwn(values, key)) continue
    if (!active()) throw Error('Page or Library changed')
    await writer.remove(key)
    delete progress[key]
  }
}
