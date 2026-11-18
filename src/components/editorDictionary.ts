import type { Dictionary } from '@blocknote/core'
import { de, en, es, fr, it, ja, ko, pl, pt, ru, vi, zh, zhTW } from '@blocknote/core/locales'
import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
import type { AppLocale } from '../lib/i18n'

const dictionaries: Partial<Record<AppLocale, Dictionary>> = {
  'de-DE': de,
  'es-419': es,
  'es-ES': es,
  'fr-FR': fr,
  'it-IT': it,
  'ja-JP': ja,
  'ko-KR': ko,
  'pl-PL': pl,
  'pt-BR': pt,
  'pt-PT': pt,
  'ru-RU': ru,
  vi,
  'zh-CN': zh,
  'zh-TW': zhTW,
}

function resolveEditorDictionary(locale: AppLocale): Dictionary {
  return dictionaries[locale] ?? en
}

function createDictionaryBinding(initial: Dictionary) {
  // The editor owns this copy for its lifetime. Never modify a package export.
  const dictionary: Dictionary = { ...initial }
  const listeners = new Set<() => void>()
  let applied = initial

  return {
    dictionary,
    getSnapshot: () => applied,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    apply(next: Dictionary) {
      if (next === applied) return
      Object.assign(dictionary, next)
      applied = next
      listeners.forEach(listener => listener())
    },
  }
}

export function useEditorDictionary(locale: AppLocale): Dictionary {
  const next = resolveEditorDictionary(locale)
  const [binding] = useState(() => createDictionaryBinding(next))
  useLayoutEffect(() => binding.apply(next), [binding, next])
  // Refresh consumers after syncing the committed locale without changing the editor instance.
  useSyncExternalStore(binding.subscribe, binding.getSnapshot, binding.getSnapshot)
  return binding.dictionary
}

export function editorPlaceholderStyles(locale: AppLocale) {
  const dictionary = resolveEditorDictionary(locale)
  const placeholders = dictionary.placeholders
  return {
    '--editor-title-placeholder': JSON.stringify(dictionary === en ? 'Title' : placeholders.heading),
    '--editor-heading-placeholder': JSON.stringify(placeholders.heading),
    '--editor-paragraph-placeholder': JSON.stringify(placeholders.default),
    '--editor-document-placeholder': JSON.stringify(placeholders.emptyDocument),
    '--editor-list-placeholder': JSON.stringify(placeholders.bulletListItem),
    '--editor-numbered-list-placeholder': JSON.stringify(placeholders.numberedListItem),
    '--editor-checklist-placeholder': JSON.stringify(placeholders.checkListItem),
    '--editor-toggle-placeholder': JSON.stringify(placeholders.toggleListItem),
  }
}
